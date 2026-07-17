import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseDirectory = path.join(projectDirectory, "src", "data", "camera-db");
const dataOutputDirectory = path.join(projectDirectory, "docs", "data");
const researchOutputDirectory = path.join(projectDirectory, "docs", "research");
const progressOutputDirectory = path.join(projectDirectory, "docs", "progress");
const officialSourceTypes = new Set([
  "official-manual",
  "official-support-page",
  "official-lut-download",
  "official-white-paper",
  "official-firmware-note"
]);

const readJson = async (absolutePath) => {
  try {
    return JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read JSON file ${absolutePath}: ${message}`);
  }
};

const readJsonDirectory = async (directoryName, excludedNames = []) => {
  const absoluteDirectory = path.join(databaseDirectory, directoryName);
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to list camera data directory ${absoluteDirectory}: ${message}`);
  }

  const values = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || excludedNames.includes(entry.name)) {
      continue;
    }
    const parsed = await readJson(path.join(absoluteDirectory, entry.name));
    if (!Array.isArray(parsed)) {
      throw new Error(`Camera data file ${entry.name} must contain a JSON array.`);
    }
    values.push(...parsed);
  }
  return values;
};

const getString = (value, fallback = "unknown") => typeof value === "string" && value.trim().length > 0 ? value : fallback;
const getArray = (value) => Array.isArray(value) ? value : [];

const main = async () => {
  const brands = await readJson(path.join(databaseDirectory, "brands", "index.json"));
  const models = await readJsonDirectory("models", ["placeholders.json"]);
  const placeholders = await readJson(path.join(databaseDirectory, "models", "placeholders.json"));
  const sources = await readJsonDirectory("sources");
  const facts = await readJsonDirectory("facts");
  const vendorAssets = await readJson(path.join(databaseDirectory, "manifests", "vendor-lut-assets.json"));
  if (![brands, models, placeholders, sources, facts, vendorAssets].every(Array.isArray)) {
    throw new Error("Camera evidence inputs must all be JSON arrays.");
  }

  const officialSources = sources.filter((source) => officialSourceTypes.has(source.sourceType));
  const verifiedFacts = facts.filter((fact) => fact.confidenceLevel === "official-confirmed" && fact.verifiedStatus === "verified");
  const sourceIds = new Set(sources.map((source) => source.id));
  for (const fact of verifiedFacts) {
    const linkedSources = getArray(fact.sourceIds);
    if (linkedSources.length === 0 || linkedSources.some((sourceId) => !sourceIds.has(sourceId))) {
      throw new Error(`Verified fact ${fact.id} does not have a complete source chain.`);
    }
  }

  const normalizedAssets = vendorAssets.map((asset) => {
    const sourceChain = getArray(asset.sourceIds);
    if (sourceChain.length === 0 || sourceChain.some((sourceId) => !sourceIds.has(sourceId))) {
      throw new Error(`Vendor asset ${asset.id} does not have a complete source chain.`);
    }
    const assetHash = typeof asset.assetHash === "string" && /^[a-f0-9]{64}$/i.test(asset.assetHash) ? asset.assetHash.toLowerCase() : null;
    return {
      id: asset.id,
      brand: asset.brand,
      modelIds: getArray(asset.modelIds),
      title: asset.title,
      downloadPageUrl: asset.downloadPageUrl,
      version: getString(asset.version),
      inputGamma: getString(asset.inputGamma),
      inputGamut: getString(asset.inputGamut),
      outputSpace: getString(asset.outputSpace),
      fileFormat: getString(asset.fileFormat),
      cubeSizes: asset.cubeSizes ?? "unknown",
      sourceIds: sourceChain,
      sourceHash: null,
      assetHash,
      localPath: null,
      redistributionAllowed: asset.redistributionAllowed === true,
      licenseStatus: getString(asset.licenseStatus),
      evidenceLevel: assetHash === null ? "official-description-only" : "official-asset-verified",
      technicalTransformStatus: assetHash === null ? "asset-binding-required" : "verified"
    };
  });

  const modelEntries = models.map((model) => {
    const linkedAssets = normalizedAssets.filter((asset) => getArray(model.officialTechnicalLutIds).includes(asset.id));
    return {
      id: model.id,
      brand: model.brand,
      model: model.model,
      productCategory: model.productCategory,
      firmwareScope: getArray(model.firmwareScope),
      supportedGammas: getArray(model.supportedGammas),
      supportedGamuts: getArray(model.supportedGamuts),
      sourceIds: getArray(model.sourceIds),
      verifiedFactIds: getArray(model.verifiedFactIds),
      unresolvedFields: getArray(model.unresolvedFields),
      officialTechnicalLutIds: getArray(model.officialTechnicalLutIds),
      confidence: model.confidenceLevel === "official-incomplete" ? "official-description-only" : "pending-verification",
      technicalTransformStatus: linkedAssets.length > 0 && linkedAssets.every((asset) => asset.technicalTransformStatus === "verified")
        ? "verified"
        : linkedAssets.length > 0
          ? "asset-binding-required"
          : "unsupported",
      lastVerifiedAt: model.lastVerifiedAt ?? null
    };
  });

  const evidenceManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    task: "S17.2-CAMERA-EVIDENCE",
    evidenceLevels: [
      "official-spec-verified",
      "official-asset-verified",
      "official-description-only",
      "community-reference",
      "pending-verification",
      "unsupported"
    ],
    summary: {
      brandDirectoryCount: brands.length,
      verifiedModelDirectoryCount: models.length,
      pendingBrandDirectoryCount: placeholders.length,
      officialSourceCount: officialSources.length,
      verifiedOfficialFactCount: verifiedFacts.length,
      unresolvedFieldCount: models.reduce((total, model) => total + getArray(model.unresolvedFields).length, 0),
      officialAssetMetadataCount: normalizedAssets.length,
      officialAssetsWithVerifiedHashCount: normalizedAssets.filter((asset) => asset.assetHash !== null).length,
      verifiedTechnicalTransformCount: normalizedAssets.filter((asset) => asset.technicalTransformStatus === "verified").length
    },
    sources: officialSources.map((source) => ({
      id: source.id,
      brand: source.brand,
      modelScope: getArray(source.modelScope),
      publisher: source.publisher,
      documentTitle: source.documentTitle,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      firmwareScope: getArray(source.firmwareScope),
      accessedAt: source.accessedAt,
      verificationStatus: source.verificationStatus,
      evidenceLevel: source.verificationStatus === "verified" ? "official-spec-verified" : "pending-verification",
      sourceHash: null,
      notes: getString(source.notes, "")
    })),
    verifiedFacts,
    models: modelEntries,
    pendingDirectories: placeholders.map((entry) => ({
      id: entry.id,
      brand: entry.brand,
      status: "pending-verification",
      models: getArray(entry.models)
    }))
  };

  const vendorManifest = {
    schemaVersion: 1,
    generatedAt: evidenceManifest.generatedAt,
    task: "S17.2-CAMERA-EVIDENCE",
    redistributionPolicy: "Vendor assets with unclear redistribution rights remain local and are not embedded in the repository.",
    assets: normalizedAssets
  };

  const sourceRows = evidenceManifest.sources.map((source) =>
    `| ${source.brand} | ${source.documentTitle} | ${source.sourceType} | ${source.verificationStatus} | [official source](${source.sourceUrl}) |`
  );
  const pendingBrands = evidenceManifest.pendingDirectories.map((entry) => entry.brand).join(", ");
  const researchMarkdown = [
    "# Camera and Log Official Sources",
    "",
    `Generated: ${evidenceManifest.generatedAt}`,
    "",
    "## Verified evidence baseline",
    "",
    `The current database contains ${evidenceManifest.summary.officialSourceCount} official source records and ${evidenceManifest.summary.verifiedOfficialFactCount} source-linked verified facts across Sony, Panasonic, DJI, ARRI, and RED. A verified page or download listing does not prove that a local technical transform binary has been downloaded, licensed, and hash-verified.`,
    "",
    "| Brand | Document | Type | Status | URL |",
    "| --- | --- | --- | --- | --- |",
    ...sourceRows,
    "",
    "## Asset boundary",
    "",
    `There are ${evidenceManifest.summary.officialAssetMetadataCount} official asset metadata records. ${evidenceManifest.summary.officialAssetsWithVerifiedHashCount} have a verified local asset hash, so the verified technical transform count remains ${evidenceManifest.summary.verifiedTechnicalTransformCount}. Redistribution is disabled for every current vendor asset record.`,
    "",
    "## Pending manufacturers",
    "",
    `The following brand directories remain pending official research and are not upgraded by this report: ${pendingBrands}.`,
    "",
    "## Product contract",
    "",
    "POST creative LUTs remain BT.709 Gamma 2.4 Full to BT.709 Gamma 2.4 Full. Camera origin metadata and current still-pixel encoding remain separate. CAMMON processing preserves the order technical, creative, monitor, range. No current vendor binary is embedded or presented as a verified transform.",
    ""
  ].join("\n");

  const completion = {
    task: "S17.2-CAMERA-EVIDENCE",
    generatedAt: evidenceManifest.generatedAt,
    status: "evidence-baseline-generated-priority-research-pending",
    started: true,
    passed: false,
    officialSources: evidenceManifest.summary.officialSourceCount,
    officialAssets: evidenceManifest.summary.officialAssetMetadataCount,
    officialAssetsWithVerifiedHash: evidenceManifest.summary.officialAssetsWithVerifiedHashCount,
    verifiedTransforms: evidenceManifest.summary.verifiedTechnicalTransformCount,
    verifiedFacts: evidenceManifest.summary.verifiedOfficialFactCount,
    pendingFacts: evidenceManifest.summary.unresolvedFieldCount,
    researchedBrands: ["sony", "panasonic", "dji", "arri", "red"],
    pendingBrands: evidenceManifest.pendingDirectories.map((entry) => entry.brand),
    blockers: [
      "Vendor LUT binary hashes and redistribution licenses are not verified.",
      "Canon and Blackmagic P0 research remains pending.",
      "Fujifilm, Nikon, and Apple P1 research remains pending.",
      "No official mathematical curve implementation was added in this phase."
    ],
    gitCommitted: false,
    gitPushed: false
  };

  await Promise.all([
    mkdir(dataOutputDirectory, { recursive: true }),
    mkdir(researchOutputDirectory, { recursive: true }),
    mkdir(progressOutputDirectory, { recursive: true })
  ]);
  await Promise.all([
    writeFile(path.join(dataOutputDirectory, "camera-evidence-manifest.json"), `${JSON.stringify(evidenceManifest, null, 2)}\n`, "utf8"),
    writeFile(path.join(dataOutputDirectory, "vendor-lut-asset-manifest.json"), `${JSON.stringify(vendorManifest, null, 2)}\n`, "utf8"),
    writeFile(path.join(researchOutputDirectory, "camera-log-official-sources.md"), researchMarkdown, "utf8"),
    writeFile(path.join(progressOutputDirectory, "S17.2-camera-data-completion.json"), `${JSON.stringify(completion, null, 2)}\n`, "utf8")
  ]);
  process.stdout.write(`${JSON.stringify({ evidenceManifest: evidenceManifest.summary, completion }, null, 2)}\n`);
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Camera evidence report generation failed: ${message}`);
  process.exitCode = 1;
}
