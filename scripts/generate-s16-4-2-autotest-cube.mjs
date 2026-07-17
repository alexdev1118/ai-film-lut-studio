import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const temporaryDirectory = join(projectDirectory, ".tmp-s16-4-2-cube");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const outputDirectory = join(projectDirectory, "local-test-assets", "S16.4.2", "cube");
const cubeBaseName = "POST_BT709_G24_FULL_S16_4_2_AUTOTEST_33pt_v1";
const cubePath = join(outputDirectory, `${cubeBaseName}.cube`);
const metadataPath = join(outputDirectory, `${cubeBaseName}.json`);

const runCompiler = () => {
  const sourceFiles = [
    join(projectDirectory, "src", "utils", "cubeExport.ts"),
    join(projectDirectory, "src", "utils", "cubeValidate.ts"),
    join(projectDirectory, "src", "utils", "cubeParser.ts"),
    join(projectDirectory, "src", "utils", "lutConsistency.ts")
  ];
  const args = [
    typescriptCli,
    "--ignoreConfig",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--ignoreDeprecations", "6.0",
    "--target", "ES2021",
    "--lib", "ES2021,DOM",
    "--esModuleInterop",
    "--skipLibCheck",
    "--strict",
    "--noEmitOnError",
    "--outDir", temporaryDirectory,
    "--rootDir", join(projectDirectory, "src"),
    ...sourceFiles
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: projectDirectory,
    encoding: "utf8"
  });

  if (result.error !== undefined) {
    throw new Error(`无法启动 TypeScript 编译器：${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter((value) => value.trim().length > 0).join("\n");
    throw new Error(`测试 Cube 依赖编译失败（退出码 ${result.status ?? "unknown"}）：\n${details}`);
  }
};

const sha256 = (content) => createHash("sha256").update(content, "utf8").digest("hex");

const main = async () => {
  if (!existsSync(typescriptCli)) {
    throw new Error(`未找到 TypeScript CLI：${typescriptCli}`);
  }

  rmSync(temporaryDirectory, { recursive: true, force: true });
  mkdirSync(temporaryDirectory, { recursive: true });
  mkdirSync(outputDirectory, { recursive: true });
  runCompiler();
  writeFileSync(join(temporaryDirectory, "package.json"), "{\"type\":\"commonjs\"}\n", "utf8");

  const requireFromScript = createRequire(import.meta.url);
  const { generateCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeExport.js"));
  const { validateCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeValidate.js"));
  const { parseCubeLut } = requireFromScript(join(temporaryDirectory, "utils", "cubeParser.js"));
  const { createCubeContentHash, createPostParameterHash, POST_LUT_COLOR_CONTRACT } = requireFromScript(
    join(temporaryDirectory, "utils", "lutConsistency.js")
  );

  const adjustments = {
    intensity: 50,
    contrast: 54,
    saturation: 58,
    temperature: 0,
    tint: 0,
    shadowMatch: 62,
    midtoneMatch: 70,
    highlightMatch: 56,
    skinToneProtection: true,
    preserveLuma: true,
    preventOversaturation: false
  };
  const lutSize = 33;
  const parameterHash = await createPostParameterHash({ adjustments, lutSize });
  const generated = generateCubeLut({
    lutName: cubeBaseName,
    lookName: "S16.4.2 AUTOTEST",
    lutSize,
    adjustments,
    parameterHash,
    sourceInputProfileId: "bt709-g24-full"
  });
  const validation = validateCubeLut(generated.content);

  if (!validation.isValid) {
    throw new Error(`Cube validator 未通过：${validation.errors.join(" ")}`);
  }

  const parsed = parseCubeLut(generated.content);
  if (parsed.lut.size !== 33 || parsed.lut.data.length !== 35_937) {
    throw new Error(`Cube parser 结果不符合 33 点要求：size=${parsed.lut.size}, rows=${parsed.lut.data.length}`);
  }
  if (
    parsed.lut.domainMin.r !== 0 || parsed.lut.domainMin.g !== 0 || parsed.lut.domainMin.b !== 0
    || parsed.lut.domainMax.r !== 1 || parsed.lut.domainMax.g !== 1 || parsed.lut.domainMax.b !== 1
  ) {
    throw new Error("Cube DOMAIN 不是 0.0 到 1.0 Full Range。");
  }
  if (parsed.lut.title !== cubeBaseName) {
    throw new Error(`Cube TITLE 不一致：${parsed.lut.title ?? "missing"}`);
  }

  const cubeHash = await createCubeContentHash(generated.content);
  const fileSha256 = sha256(generated.content);
  if (cubeHash !== fileSha256) {
    throw new Error(`项目 Cube Hash 与文件 SHA-256 不一致：${cubeHash} != ${fileSha256}`);
  }

  writeFileSync(cubePath, generated.content, "utf8");
  const metadata = {
    task: "S16.4.2-CU-FOCUS-RECOVERY",
    generatedAt: new Date().toISOString(),
    fileName: `${cubeBaseName}.cube`,
    title: parsed.lut.title,
    lutSize: parsed.lut.size,
    dataLineCount: parsed.lut.data.length,
    domainMin: parsed.lut.domainMin,
    domainMax: parsed.lut.domainMax,
    parameters: adjustments,
    parameterHash,
    cubeHash,
    fileSha256,
    inputContract: POST_LUT_COLOR_CONTRACT,
    outputContract: POST_LUT_COLOR_CONTRACT,
    technicalConversionIncluded: false,
    davinciKeyOutputGainRecommendation: 1,
    validation: {
      isValid: validation.isValid,
      expectedDataLineCount: validation.expectedDataLineCount,
      dataLineCount: validation.dataLineCount,
      errors: validation.errors,
      warnings: validation.warnings,
      parserWarnings: parsed.warnings
    }
  };
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify({ cubePath: resolve(cubePath), metadataPath: resolve(metadataPath), ...metadata }, null, 2)}\n`);
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "未知的测试 Cube 生成错误";
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
