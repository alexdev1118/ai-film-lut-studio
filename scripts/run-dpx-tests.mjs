import { existsSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const outputDirectory = join(projectDirectory, ".tmp-dpx-tests");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const testFile = join(outputDirectory, "tests", "dpx.test.js");
const realFileTest = join(outputDirectory, "tests", "dpxRealFile.test.js");

const runCommand = (command, args, label) => {
  const result = spawnSync(command, args, { cwd: projectDirectory, stdio: "inherit" });
  if (result.error !== undefined) {
    throw new Error(`${label} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
};

try {
  if (!existsSync(typescriptCli)) {
    throw new Error(`TypeScript CLI was not found: ${typescriptCli}`);
  }

  rmSync(outputDirectory, { recursive: true, force: true });
  runCommand(process.execPath, [typescriptCli, "-p", "tsconfig.dpx-tests.json"], "DPX test compilation");
  writeFileSync(join(outputDirectory, "package.json"), '{"type":"commonjs"}\n', "utf8");
  runCommand(process.execPath, ["--test", testFile, realFileTest], "DPX tests");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown DPX test error";
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
