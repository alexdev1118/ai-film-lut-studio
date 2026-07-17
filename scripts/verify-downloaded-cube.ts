import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseCubeLut } from "../src/utils/cubeParser";
import { validateCubeLut } from "../src/utils/cubeValidate";

interface DownloadedCubeVerification {
  readonly path: string;
  readonly title: string | null;
  readonly sha256: string;
  readonly lutSize: number;
  readonly dataLineCount: number;
  readonly domainMin: { readonly r: number; readonly g: number; readonly b: number };
  readonly domainMax: { readonly r: number; readonly g: number; readonly b: number };
  readonly parserPassed: true;
  readonly validatorPassed: true;
  readonly inputContract: string | null;
  readonly outputContract: string | null;
  readonly parameterHash: string | null;
  readonly technicalConversionIncluded: string | null;
}

const commentValue = (comments: readonly string[], label: string): string | null => {
  const value = comments.find((comment) => comment.startsWith(label));
  return value === undefined ? null : value.slice(label.length).trim();
};

const verifyDownloadedCube = async (inputPath: string): Promise<DownloadedCubeVerification> => {
  const path = resolve(inputPath);
  const content = await readFile(path, "utf8");
  const validation = validateCubeLut(content);
  const parsed = parseCubeLut(content);

  if (!validation.isValid) {
    throw new Error(`Cube validation failed: ${validation.errors.join(" | ")}`);
  }

  if (validation.dataLineCount !== parsed.lut.data.length) {
    throw new Error("Cube parser data line count does not match validation data line count.");
  }

  return {
    path,
    title: parsed.lut.title ?? null,
    sha256: createHash("sha256").update(content, "utf8").digest("hex"),
    lutSize: parsed.lut.size,
    dataLineCount: parsed.lut.data.length,
    domainMin: parsed.lut.domainMin,
    domainMax: parsed.lut.domainMax,
    parserPassed: true,
    validatorPassed: true,
    inputContract: commentValue(parsed.lut.comments, "Input Contract:"),
    outputContract: commentValue(parsed.lut.comments, "Output Contract:"),
    parameterHash: commentValue(parsed.lut.comments, "Parameter Hash:"),
    technicalConversionIncluded: commentValue(parsed.lut.comments, "Technical Conversion Included:")
  };
};

const run = async (): Promise<void> => {
  const inputPath = process.argv[2];
  if (inputPath === undefined || inputPath.trim().length === 0) {
    throw new Error("Usage: verify-downloaded-cube <cube-file-path>");
  }

  const verification = await verifyDownloadedCube(inputPath);
  console.log(JSON.stringify(verification, null, 2));
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown downloaded Cube verification error.";
  console.error(`Downloaded Cube verification failed: ${message}`);
  process.exitCode = 1;
});
