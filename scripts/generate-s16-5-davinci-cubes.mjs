import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const temporaryDirectory = join(projectDirectory, ".tmp-s16-5-cubes");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const outputDirectory = join(projectDirectory, "local-test-assets", "S16.5", "cube");
const strengthLevels = [35, 50, 70, 100];

const runCompiler = () => {
  const sourceFiles = [
    join(projectDirectory, "src", "utils", "cubeExport.ts"),
    join(projectDirectory, "src", "utils", "cubeValidate.ts"),
    join(projectDirectory, "src", "utils", "cubeParser.ts"),
    join(projectDirectory, "src", "utils", "lutConsistency.ts")
  ];
  const result = spawnSync(process.execPath, [
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
  ], { cwd: projectDirectory, encoding: "utf8" });

  if (result.error !== undefined) {
    throw new Error(`S16.5 Cube dependency compilation could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter((value) => value.trim().length > 0).join("\n");
    throw new Error(`S16.5 Cube dependency compilation failed with exit code ${result.status ?? "unknown"}:\n${details}`);
  }
};

const sha256 = (content) => createHash("sha256").update(content, "utf8").digest("hex");

const main = async () => {
  if (!existsSync(typescriptCli)) {
    throw new Error(`TypeScript CLI was not found at ${typescriptCli}.`);
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
  const generatedFiles = [];

  for (const intensity of strengthLevels) {
    const cubeBaseName = `POST_BT709_G24_FULL_S16_5_V3_${intensity}pct_33pt_v2`;
    const adjustments = {
      intensity,
      contrast: 28,
      saturation: 32,
      temperature: 4,
      tint: -2,
      shadowMatch: 57,
      midtoneMatch: 62,
      highlightMatch: 56,
      skinToneProtection: true,
      preserveLuma: true,
      preventOversaturation: true
    };
    const lutSize = 33;
    const parameterHash = await createPostParameterHash({ adjustments, lutSize });
    const generated = generateCubeLut({
      lutName: cubeBaseName,
      lookName: `S16.5 V3 hue-safe ${intensity}%`,
      lutSize,
      adjustments,
      parameterHash,
      sourceInputProfileId: "bt709-g24-full"
    });
    const validation = validateCubeLut(generated.content);
    if (!validation.isValid) {
      throw new Error(`${cubeBaseName} failed Cube validation: ${validation.errors.join(" ")}`);
    }

    const parsed = parseCubeLut(generated.content);
    if (parsed.lut.size !== 33 || parsed.lut.data.length !== 35_937) {
      throw new Error(`${cubeBaseName} has invalid dimensions: size=${parsed.lut.size}, rows=${parsed.lut.data.length}.`);
    }
    if (parsed.lut.title !== cubeBaseName) {
      throw new Error(`${cubeBaseName} TITLE mismatch: ${parsed.lut.title ?? "missing"}.`);
    }

    const cubeHash = await createCubeContentHash(generated.content);
    const fileSha256 = sha256(generated.content);
    if (cubeHash !== fileSha256) {
      throw new Error(`${cubeBaseName} project hash and file SHA-256 differ.`);
    }

    const cubePath = join(outputDirectory, `${cubeBaseName}.cube`);
    const metadataPath = join(outputDirectory, `${cubeBaseName}.json`);
    writeFileSync(cubePath, generated.content, "utf8");
    const metadata = {
      task: "S16.5-LUT-STRENGTH-GAMUT-SAFETY-V3",
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
    generatedFiles.push({
      strength: intensity,
      cubePath: resolve(cubePath),
      metadataPath: resolve(metadataPath),
      fileSha256,
      parameterHash,
      title: parsed.lut.title,
      dataLineCount: parsed.lut.data.length
    });
  }

  process.stdout.write(`${JSON.stringify({ generatedFiles }, null, 2)}\n`);
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown S16.5 Cube generation error.";
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
