import { existsSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const outputDirectory = join(projectDirectory, ".tmp-downloaded-cube-verification");
const typescriptCli = join(projectDirectory, "node_modules", "typescript", "bin", "tsc");
const verificationFile = join(outputDirectory, "scripts", "verify-downloaded-cube.js");
const inputPath = process.argv[2];

const runCommand = (command, args, label) => {
  const result = spawnSync(command, args, { cwd: projectDirectory, stdio: "inherit" });
  if (result.error !== undefined) {
    throw new Error(`${label} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
};

try {
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new Error("Usage: npm run verify:downloaded-cube -- <cube-file-path>");
  }
  if (!existsSync(typescriptCli)) {
    throw new Error(`TypeScript CLI was not found at ${typescriptCli}.`);
  }

  rmSync(outputDirectory, { recursive: true, force: true });
  runCommand(process.execPath, [typescriptCli, "-p", "tsconfig.downloaded-cube-verification.json"], "Downloaded Cube verification compilation");
  writeFileSync(join(outputDirectory, "package.json"), "{\"type\":\"commonjs\"}\n", "utf8");
  runCommand(process.execPath, [verificationFile, inputPath], "Downloaded Cube verification");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown downloaded Cube verification runner error.";
  console.error(message);
  process.exitCode = 1;
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
