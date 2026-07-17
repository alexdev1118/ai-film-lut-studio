import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectDirectory = process.cwd();
const manifestPath = join(projectDirectory, "src", "data", "stylePreviewManifest.json");
const expectedStrengths = [35, 50, 70, 100];
const expectedSceneIds = [
  "portrait-normal",
  "portrait-close",
  "blue-sky",
  "blue-sky-greenery",
  "daylight-high-contrast",
  "saturated-red"
];

const readManifest = () => {
  try {
    const raw = readFileSync(manifestPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read style preview manifest at ${manifestPath}: ${message}`);
  }
};

const assertString = (value, label) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
};

const assertNumber = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
};

const manifest = readManifest();
if (!Array.isArray(manifest.entries)) {
  throw new Error("Style preview manifest entries must be an array.");
}
if (!Array.isArray(manifest.sceneEntries)) {
  throw new Error("Style preview manifest sceneEntries must be an array.");
}

const styleIds = [...new Set(manifest.entries.map((entry, index) => assertString(entry.styleId, `entries[${index}].styleId`)))];
if (styleIds.length !== 12) {
  throw new Error(`Expected 12 unique formal styles, received ${styleIds.length}.`);
}

for (const styleId of styleIds) {
  const strengthEntries = manifest.entries.filter((entry) => entry.styleId === styleId);
  const strengths = strengthEntries.map((entry, index) => assertNumber(entry.strength, `${styleId}.entries[${index}].strength`)).sort((left, right) => left - right);
  if (JSON.stringify(strengths) !== JSON.stringify(expectedStrengths)) {
    throw new Error(`${styleId} strength previews are incomplete: ${strengths.join(", ")}.`);
  }

  const strengthPaths = new Set();
  for (const [index, entry] of strengthEntries.entries()) {
    const previewPath = assertString(entry.previewPath, `${styleId}.entries[${index}].previewPath`);
    const parameterHash = assertString(entry.parameterHash, `${styleId}.entries[${index}].parameterHash`);
    const cubeHash = assertString(entry.cubeHash, `${styleId}.entries[${index}].cubeHash`);
    const previewHash = assertString(entry.previewHash, `${styleId}.entries[${index}].previewHash`);
    if (strengthPaths.has(previewPath)) {
      throw new Error(`${styleId} reuses the same strength preview path: ${previewPath}.`);
    }
    strengthPaths.add(previewPath);
    const absolutePreviewPath = join(projectDirectory, previewPath);
    if (!existsSync(absolutePreviewPath)) {
      throw new Error(`${styleId} strength preview is missing on disk: ${absolutePreviewPath}.`);
    }
    if (parameterHash.length !== 64 || cubeHash.length !== 64 || previewHash.length !== 64) {
      throw new Error(`${styleId} strength preview ${entry.strength} has an invalid SHA-256 metadata value.`);
    }
    if (entry.generatedFromFinalCube !== true) {
      throw new Error(`${styleId} strength preview ${entry.strength} is not declared as generated from the final Cube.`);
    }
  }

  const sceneEntries = manifest.sceneEntries.filter((entry) => entry.styleId === styleId);
  const sceneIds = sceneEntries.map((entry, index) => assertString(entry.sceneId, `${styleId}.sceneEntries[${index}].sceneId`)).sort();
  const expectedSortedSceneIds = [...expectedSceneIds].sort();
  if (JSON.stringify(sceneIds) !== JSON.stringify(expectedSortedSceneIds)) {
    throw new Error(`${styleId} scene previews are incomplete: ${sceneIds.join(", ")}.`);
  }

  const scenePaths = new Set();
  for (const [index, entry] of sceneEntries.entries()) {
    const previewPath = assertString(entry.previewPath, `${styleId}.sceneEntries[${index}].previewPath`);
    if (scenePaths.has(previewPath)) {
      throw new Error(`${styleId} reuses the same preview path for multiple validation scenes: ${previewPath}.`);
    }
    scenePaths.add(previewPath);
    const absolutePreviewPath = join(projectDirectory, previewPath);
    if (!existsSync(absolutePreviewPath)) {
      throw new Error(`${styleId} scene preview is missing on disk: ${absolutePreviewPath}.`);
    }
    if (entry.source !== "procedural-stress-fixture" || entry.generatedFromFinalCube !== true) {
      throw new Error(`${styleId} scene preview ${entry.sceneId} has an invalid provenance declaration.`);
    }
  }
}

const uniqueParameterHashes = new Set(manifest.entries.map((entry) => assertString(entry.parameterHash, `${entry.styleId}.parameterHash`)));
const uniqueCubeHashes = new Set(manifest.entries.map((entry) => assertString(entry.cubeHash, `${entry.styleId}.cubeHash`)));
if (uniqueParameterHashes.size < styleIds.length) {
  throw new Error(`Style parameters are not sufficiently distinct: ${uniqueParameterHashes.size} hashes for ${styleIds.length} styles.`);
}
if (uniqueCubeHashes.size < styleIds.length) {
  throw new Error(`Style Cubes are not sufficiently distinct: ${uniqueCubeHashes.size} hashes for ${styleIds.length} styles.`);
}

process.stdout.write(`${JSON.stringify({
  styleCount: styleIds.length,
  strengthPreviewCount: manifest.entries.length,
  scenePreviewCount: manifest.sceneEntries.length,
  expectedScenePreviewCount: styleIds.length * expectedSceneIds.length,
  distinctParameterHashCount: uniqueParameterHashes.size,
  distinctCubeHashCount: uniqueCubeHashes.size,
  passed: true
}, null, 2)}\n`);
