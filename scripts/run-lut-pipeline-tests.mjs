import { existsSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const outputDirectory = join(projectDirectory, ".tmp-lut-tests");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const testFile = join(outputDirectory, "tests", "lutPipeline.test.js");

const runCommand = (command, args, label) => {
  const result = spawnSync(command, args, { cwd: projectDirectory, stdio: "inherit" });
  if (result.error !== undefined) {
    throw new Error(`${label} 无法启动：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} 失败，退出码 ${result.status ?? "unknown"}`);
  }
};

try {
  if (!existsSync(typescriptCli)) {
    throw new Error(`未找到 TypeScript CLI：${typescriptCli}`);
  }

  rmSync(outputDirectory, { recursive: true, force: true });
  runCommand(process.execPath, [typescriptCli, "-p", "tsconfig.lut-tests.json"], "LUT 测试编译");
  writeFileSync(join(outputDirectory, "package.json"), '{"type":"commonjs"}\n', "utf8");
  runCommand(process.execPath, ["--test", testFile], "LUT 管线测试");
} catch (error) {
  const message = error instanceof Error ? error.message : "未知测试执行错误";
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
