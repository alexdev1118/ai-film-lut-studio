import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseRoot = path.join(projectRoot, "src", "data", "camera-db");
const officialSourceTypes = new Set(["official-manual", "official-support-page", "official-lut-download", "official-white-paper", "official-firmware-note"]);
const allowedCubeSizes = new Set([17, 33, 65]);

const readJson = async (relativePath) => {
  const absolutePath = path.join(databaseRoot, relativePath);
  try {
    return JSON.parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${relativePath}: ${message}`);
  }
};

const readJsonDirectory = async (directoryName, excludedFiles = []) => {
  const directoryPath = path.join(databaseRoot, directoryName);
  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to list ${directoryName}: ${message}`);
  }

  const arrays = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !excludedFiles.includes(entry.name))
      .map((entry) => readJson(path.join(directoryName, entry.name)))
  );
  return arrays.flat();
};

const requireArray = (value, label, errors) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return [];
  }
  return value;
};

const requireString = (record, field, label, errors) => {
  if (typeof record[field] !== "string" || record[field].trim().length === 0) errors.push(`${label}.${field} must be a non-empty string.`);
};

const assertUniqueIds = (records, label, errors) => {
  const ids = new Set();
  for (const record of records) {
    requireString(record, "id", label, errors);
    if (typeof record.id === "string" && ids.has(record.id)) errors.push(`${label} contains duplicate id ${record.id}.`);
    if (typeof record.id === "string") ids.add(record.id);
  }
  return ids;
};

const main = async () => {
  const errors = [];
  const warnings = [];
  const brands = requireArray(await readJson("brands/index.json"), "brands", errors);
  const models = requireArray(await readJsonDirectory("models", ["placeholders.json"]), "models", errors);
  const sources = requireArray(await readJsonDirectory("sources"), "sources", errors);
  const facts = requireArray(await readJsonDirectory("facts"), "facts", errors);
  const communityNotes = requireArray(await readJson("community-notes/index.json"), "communityNotes", errors);
  const conflicts = requireArray(await readJson("manifests/conflicts.json"), "conflicts", errors);
  const vendorLutAssets = requireArray(await readJson("manifests/vendor-lut-assets.json"), "vendorLutAssets", errors);

  const brandIds = assertUniqueIds(brands, "brands", errors);
  const modelIds = assertUniqueIds(models, "models", errors);
  const sourceIds = assertUniqueIds(sources, "sources", errors);
  const factIds = assertUniqueIds(facts, "facts", errors);
  assertUniqueIds(communityNotes, "communityNotes", errors);
  assertUniqueIds(conflicts, "conflicts", errors);
  const assetIds = assertUniqueIds(vendorLutAssets, "vendorLutAssets", errors);

  for (const source of sources) {
    requireString(source, "brand", `source:${source.id}`, errors);
    requireString(source, "sourceType", `source:${source.id}`, errors);
    requireString(source, "publisher", `source:${source.id}`, errors);
    requireString(source, "documentTitle", `source:${source.id}`, errors);
    requireString(source, "sourceUrl", `source:${source.id}`, errors);
    requireString(source, "accessedAt", `source:${source.id}`, errors);
    try {
      new URL(source.sourceUrl);
    } catch {
      errors.push(`Source ${source.id} has an invalid URL.`);
    }
    if (!brandIds.has(source.brand)) errors.push(`Source ${source.id} references unknown brand ${source.brand}.`);
    for (const modelId of requireArray(source.modelScope, `source:${source.id}.modelScope`, errors)) if (!modelIds.has(modelId)) errors.push(`Source ${source.id} references unknown model ${modelId}.`);
    if ((source.sourceType === "community-test" || source.sourceType === "user-feedback") && source.verificationStatus === "verified") {
      errors.push(`Community source ${source.id} cannot be marked verified.`);
    }
  }

  for (const model of models) {
    if (!brandIds.has(model.brand)) errors.push(`Model ${model.id} references unknown brand ${model.brand}.`);
    for (const sourceId of requireArray(model.sourceIds, `model:${model.id}.sourceIds`, errors)) if (!sourceIds.has(sourceId)) errors.push(`Model ${model.id} references missing source ${sourceId}.`);
    for (const factId of requireArray(model.verifiedFactIds, `model:${model.id}.verifiedFactIds`, errors)) if (!factIds.has(factId)) errors.push(`Model ${model.id} references missing fact ${factId}.`);
    for (const assetId of requireArray(model.officialTechnicalLutIds, `model:${model.id}.officialTechnicalLutIds`, errors)) if (!assetIds.has(assetId)) errors.push(`Model ${model.id} references missing vendor LUT ${assetId}.`);
    const sizes = model.lutCapability?.supportedCubeSizes;
    if (Array.isArray(sizes) && sizes.some((size) => !allowedCubeSizes.has(size))) errors.push(`Model ${model.id} has unsupported cube size metadata.`);
    if (model.lutCapability?.fileNameLimit === 0 || model.lutCapability?.slotCount === 0) errors.push(`Model ${model.id} uses numeric zero where unknown is required.`);
  }

  for (const fact of facts) {
    if (!modelIds.has(fact.modelId)) errors.push(`Fact ${fact.id} references unknown model ${fact.modelId}.`);
    const linkedSources = requireArray(fact.sourceIds, `fact:${fact.id}.sourceIds`, errors).map((sourceId) => sources.find((source) => source.id === sourceId));
    if (linkedSources.some((source) => source === undefined)) errors.push(`Fact ${fact.id} references a missing source.`);
    if (fact.confidenceLevel === "official-confirmed" && !linkedSources.some((source) => source && officialSourceTypes.has(source.sourceType))) {
      errors.push(`Official fact ${fact.id} has no official source.`);
    }
    if (fact.verifiedStatus === "verified" && fact.confidenceLevel === "unknown") errors.push(`Fact ${fact.id} cannot be verified with unknown confidence.`);
  }

  for (const note of communityNotes) {
    if (note.officialStatus !== "not-official") errors.push(`Community note ${note.id} must be not-official.`);
    if (!modelIds.has(note.modelId)) errors.push(`Community note ${note.id} references unknown model ${note.modelId}.`);
  }

  for (const conflict of conflicts) {
    for (const factId of requireArray(conflict.factIds, `conflict:${conflict.id}.factIds`, errors)) if (!factIds.has(factId)) errors.push(`Conflict ${conflict.id} references missing fact ${factId}.`);
    if (conflict.status === "open") warnings.push(`Open conflict ${conflict.id}.`);
  }

  const summary = {
    brands: brands.length,
    models: models.length,
    officialSources: sources.filter((source) => officialSourceTypes.has(source.sourceType)).length,
    verifiedOfficialFacts: facts.filter((fact) => fact.confidenceLevel === "official-confirmed" && fact.verifiedStatus === "verified").length,
    communityNotes: communityNotes.length,
    unresolvedFields: models.reduce((total, model) => total + requireArray(model.unresolvedFields, `model:${model.id}.unresolvedFields`, errors).length, 0),
    conflicts: conflicts.length,
    vendorLutAssets: vendorLutAssets.length,
    warnings: warnings.length,
    errors: errors.length
  };

  console.log(JSON.stringify(summary, null, 2));
  for (const warning of warnings) console.warn(`WARNING: ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Camera data validation failed: ${message}`);
  process.exitCode = 1;
}
