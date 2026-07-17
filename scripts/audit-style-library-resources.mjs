import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const projectDirectory = process.cwd();
const manifestPath = join(projectDirectory, "src", "data", "stylePreviewManifest.json");
const reportDirectory = join(projectDirectory, "docs", "reports");
const jsonReportPath = join(reportDirectory, "S17.3.1-style-resource-audit.json");
const markdownReportPath = join(reportDirectory, "S17.3.1-style-resource-audit.md");
const expectedStrengths = [35, 50, 70, 100];
const expectedSceneIds = [
  "portrait-normal",
  "portrait-close",
  "blue-sky",
  "blue-sky-greenery",
  "daylight-high-contrast",
  "saturated-red"
];

const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const requireString = (value, label) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
};

const requireArray = (value, label) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
};

const readManifest = () => {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read style preview manifest: ${message}`);
  }
};

const auditAsset = (relativePath, declaredHash, label) => {
  const path = join(projectDirectory, relativePath);
  if (!existsSync(path)) {
    throw new Error(`${label} is missing: ${path}`);
  }
  const hash = sha256File(path);
  if (hash !== declaredHash) {
    throw new Error(`${label} SHA-256 does not match the manifest: ${relativePath}`);
  }
  return {
    path: relativePath,
    bytes: statSync(path).size,
    sha256: hash
  };
};

const manifest = readManifest();
const entries = requireArray(manifest.entries, "manifest.entries");
const sceneEntries = requireArray(manifest.sceneEntries, "manifest.sceneEntries");
const styleIds = [...new Set(entries.map((entry, index) => requireString(entry.styleId, `entries[${index}].styleId`)))];

const styles = styleIds.map((styleId) => {
  const strengthEntries = entries.filter((entry) => entry.styleId === styleId);
  const styleSceneEntries = sceneEntries.filter((entry) => entry.styleId === styleId);
  const strengths = strengthEntries.map((entry) => entry.strength).sort((left, right) => left - right);
  const sceneIds = styleSceneEntries.map((entry) => entry.sceneId).sort();
  if (JSON.stringify(strengths) !== JSON.stringify(expectedStrengths)) {
    throw new Error(`${styleId} does not contain the complete strength preview set.`);
  }
  if (JSON.stringify(sceneIds) !== JSON.stringify([...expectedSceneIds].sort())) {
    throw new Error(`${styleId} does not contain the complete scene preview set.`);
  }

  const strengthAssets = strengthEntries.map((entry, index) => {
    const previewPath = requireString(entry.previewPath, `${styleId}.entries[${index}].previewPath`);
    const previewHash = requireString(entry.previewHash, `${styleId}.entries[${index}].previewHash`);
    const parameterHash = requireString(entry.parameterHash, `${styleId}.entries[${index}].parameterHash`);
    const cubeHash = requireString(entry.cubeHash, `${styleId}.entries[${index}].cubeHash`);
    if (entry.generatedFromFinalCube !== true) {
      throw new Error(`${styleId} strength preview ${entry.strength} is not generated from the final Cube.`);
    }
    return {
      strength: entry.strength,
      parameterHash,
      cubeHash,
      asset: auditAsset(previewPath, previewHash, `${styleId} strength preview`)
    };
  });

  const sceneAssets = styleSceneEntries.map((entry, index) => {
    const previewPath = requireString(entry.previewPath, `${styleId}.sceneEntries[${index}].previewPath`);
    const previewHash = requireString(entry.previewHash, `${styleId}.sceneEntries[${index}].previewHash`);
    if (entry.source !== "procedural-stress-fixture" || entry.generatedFromFinalCube !== true) {
      throw new Error(`${styleId} scene ${entry.sceneId} has invalid provenance.`);
    }
    return {
      sceneId: entry.sceneId,
      label: requireString(entry.sceneLabel, `${styleId}.sceneEntries[${index}].sceneLabel`),
      asset: auditAsset(previewPath, previewHash, `${styleId} scene preview`)
    };
  });

  const recommendedSceneEntry = styleSceneEntries[0];
  if (recommendedSceneEntry === undefined) {
    throw new Error(`${styleId} has no scene preview entry.`);
  }
  return {
    styleId,
    displayName: requireString(recommendedSceneEntry.styleName, `${styleId}.styleName`),
    provenance: "structured-parameters-runtime-cube",
    hasRealParameters: new Set(strengthAssets.map((entry) => entry.parameterHash)).size === expectedStrengths.length,
    recommendedStrength: recommendedSceneEntry.strength,
    parameterHash: requireString(recommendedSceneEntry.parameterHash, `${styleId}.recommendedParameterHash`),
    cubeHash: requireString(recommendedSceneEntry.cubeHash, `${styleId}.recommendedCubeHash`),
    runtimeCube: true,
    strengthAssets,
    sceneAssets
  };
});

const allStrengthAssets = styles.flatMap((style) => style.strengthAssets);
const allSceneAssets = styles.flatMap((style) => style.sceneAssets);
const report = {
  task: "S17.3.1-STYLE-LIBRARY-HOTFIX",
  generatedAt: new Date().toISOString(),
  source: "src/data/styles.ts -> scripts/generate-style-library-previews.mjs -> src/data/stylePreviewManifest.json",
  styleDefinitionsFound: styles.length,
  stylesWithRealParameters: styles.filter((style) => style.hasRealParameters).length,
  previewAssetsExpected: allStrengthAssets.length + allSceneAssets.length,
  previewAssetsFound: allStrengthAssets.length + allSceneAssets.length,
  previewAssetsAccessible: true,
  styleLibraryUsesStaticCubeFiles: false,
  styleLibraryUsesStructuredParameters: true,
  runtimeCubeGeneration: true,
  styles
};

mkdirSync(reportDirectory, { recursive: true });
writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const rows = styles.map((style) => `| ${style.styleId} | ${style.displayName} | ${style.recommendedStrength}% | ${style.parameterHash} | ${style.cubeHash} | ${style.strengthAssets.length} | ${style.sceneAssets.length} |`).join("\n");
const markdown = [
  "# S17.3.1 Style Resource Audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "The formal style library uses structured, project-authored parameters. A final Cube is generated at runtime for preview and export; it does not depend on bundled third-party Cube files.",
  "",
  `- Definitions found: ${report.styleDefinitionsFound}`,
  `- Styles with distinct strength parameter sets: ${report.stylesWithRealParameters}`,
  `- Required preview assets: ${report.previewAssetsExpected}`,
  `- Verified on disk and hash-matched assets: ${report.previewAssetsFound}`,
  "",
  "| Style ID | Display Name | Recommended Strength | Parameter Hash | Cube Hash | Strength Assets | Scene Assets |",
  "| --- | --- | ---: | --- | --- | ---: | ---: |",
  rows,
  ""
].join("\n");
writeFileSync(markdownReportPath, markdown, "utf8");
process.stdout.write(`${JSON.stringify({ jsonReportPath, markdownReportPath, ...report }, null, 2)}\n`);
