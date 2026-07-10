import type {
  CameraBrandRecord,
  CameraCommunityNote,
  CameraDataConflict,
  CameraDatabase,
  CameraDatabaseFact,
  CameraDatabaseSource,
  CameraModelRecord,
  VendorLutAsset
} from "../types/cameraData";

export interface CameraDataValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isStringArray = (value: unknown): value is readonly string[] => Array.isArray(value) && value.every(isString);
const hasString = (value: Record<string, unknown>, key: string): boolean => isString(value[key]) && value[key].trim().length > 0;

const isBrandRecord = (value: unknown): value is CameraBrandRecord =>
  isRecord(value) && hasString(value, "id") && hasString(value, "label") && isStringArray(value.aliases) && isStringArray(value.sourceIds) && hasString(value, "coverageState");

const isModelRecord = (value: unknown): value is CameraModelRecord =>
  isRecord(value) &&
  hasString(value, "id") &&
  hasString(value, "brand") &&
  hasString(value, "model") &&
  isStringArray(value.aliases) &&
  hasString(value, "productCategory") &&
  hasString(value, "sensorFormat") &&
  Array.isArray(value.firmwareScope) &&
  isRecord(value.lutCapability) &&
  isRecord(value.monitoringCapability) &&
  isRecord(value.recordingCapability) &&
  isRecord(value.exposure) &&
  isStringArray(value.officialTechnicalLutIds) &&
  isStringArray(value.verifiedFactIds) &&
  isStringArray(value.sourceIds) &&
  isStringArray(value.communityNoteIds) &&
  isStringArray(value.unresolvedFields) &&
  hasString(value, "confidenceLevel");

const isSourceRecord = (value: unknown): value is CameraDatabaseSource =>
  isRecord(value) &&
  hasString(value, "id") &&
  hasString(value, "brand") &&
  isStringArray(value.modelScope) &&
  hasString(value, "publisher") &&
  hasString(value, "documentTitle") &&
  hasString(value, "sourceType") &&
  isStringArray(value.firmwareScope) &&
  hasString(value, "accessedAt") &&
  hasString(value, "sourceUrl") &&
  hasString(value, "verificationStatus") &&
  hasString(value, "shortEvidenceSummary") &&
  isStringArray(value.conflictingSourceIds) &&
  isString(value.notes);

const isFactRecord = (value: unknown): value is CameraDatabaseFact =>
  isRecord(value) &&
  hasString(value, "id") &&
  hasString(value, "brand") &&
  hasString(value, "modelId") &&
  hasString(value, "category") &&
  hasString(value, "field") &&
  value.value !== undefined &&
  isStringArray(value.sourceIds) &&
  hasString(value, "confidenceLevel") &&
  hasString(value, "verifiedStatus") &&
  isStringArray(value.firmwareScope) &&
  hasString(value, "shortEvidenceSummary") &&
  isStringArray(value.conflictingSourceIds) &&
  isString(value.notes) &&
  hasString(value, "lastVerifiedAt");

const isCommunityNote = (value: unknown): value is CameraCommunityNote =>
  isRecord(value) && hasString(value, "id") && hasString(value, "modelId") && value.officialStatus === "not-official";

const isConflict = (value: unknown): value is CameraDataConflict =>
  isRecord(value) && hasString(value, "id") && hasString(value, "modelId") && hasString(value, "field") && isStringArray(value.factIds) && isStringArray(value.sourceIds);

const isVendorLutAsset = (value: unknown): value is VendorLutAsset =>
  isRecord(value) &&
  hasString(value, "id") &&
  hasString(value, "brand") &&
  isStringArray(value.modelIds) &&
  hasString(value, "title") &&
  hasString(value, "downloadPageUrl") &&
  hasString(value, "fileName") &&
  hasString(value, "version") &&
  hasString(value, "inputGamma") &&
  hasString(value, "inputGamut") &&
  hasString(value, "outputSpace") &&
  hasString(value, "fileFormat") &&
  hasString(value, "licenseStatus") &&
  typeof value.redistributionAllowed === "boolean" &&
  hasString(value, "verificationStatus") &&
  isStringArray(value.sourceIds);

const isCameraDatabase = (value: unknown): value is CameraDatabase =>
  isRecord(value) &&
  Array.isArray(value.brands) && value.brands.every(isBrandRecord) &&
  Array.isArray(value.models) && value.models.every(isModelRecord) &&
  Array.isArray(value.sources) && value.sources.every(isSourceRecord) &&
  Array.isArray(value.facts) && value.facts.every(isFactRecord) &&
  Array.isArray(value.communityNotes) && value.communityNotes.every(isCommunityNote) &&
  Array.isArray(value.conflicts) && value.conflicts.every(isConflict) &&
  Array.isArray(value.vendorLutAssets) && value.vendorLutAssets.every(isVendorLutAsset);

export const validateCameraDatabase = (value: unknown): CameraDataValidationResult => {
  if (!isCameraDatabase(value)) {
    return { isValid: false, errors: ["Camera database failed structural validation."], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const brandIds = new Set(value.brands.map((brand) => brand.id));
  const modelIds = new Set(value.models.map((model) => model.id));
  const sourceIds = new Set(value.sources.map((source) => source.id));
  const factIds = new Set(value.facts.map((fact) => fact.id));
  const officialSourceTypes = new Set(["official-manual", "official-support-page", "official-lut-download", "official-white-paper", "official-firmware-note"]);

  for (const model of value.models) {
    if (!brandIds.has(model.brand)) errors.push(`Model ${model.id} references unknown brand ${model.brand}.`);
    for (const sourceId of model.sourceIds) if (!sourceIds.has(sourceId)) errors.push(`Model ${model.id} references missing source ${sourceId}.`);
    for (const factId of model.verifiedFactIds) if (!factIds.has(factId)) errors.push(`Model ${model.id} references missing fact ${factId}.`);
  }

  for (const fact of value.facts) {
    if (!modelIds.has(fact.modelId)) errors.push(`Fact ${fact.id} references missing model ${fact.modelId}.`);
    const linkedSources = fact.sourceIds.map((sourceId) => value.sources.find((source) => source.id === sourceId)).filter((source): source is CameraDatabaseSource => source !== undefined);
    if (linkedSources.length !== fact.sourceIds.length) errors.push(`Fact ${fact.id} references one or more missing sources.`);
    if (fact.confidenceLevel === "official-confirmed" && !linkedSources.some((source) => officialSourceTypes.has(source.sourceType))) {
      errors.push(`Official fact ${fact.id} has no official source.`);
    }
  }

  for (const source of value.sources) {
    try {
      new URL(source.sourceUrl);
    } catch {
      errors.push(`Source ${source.id} has an invalid URL.`);
    }
    if (source.sourceType === "community-test" && source.verificationStatus === "verified") {
      errors.push(`Community source ${source.id} cannot be marked verified official evidence.`);
    }
  }

  for (const conflict of value.conflicts) {
    if (conflict.status === "open") warnings.push(`Open conflict: ${conflict.id}.`);
    for (const factId of conflict.factIds) if (!factIds.has(factId)) errors.push(`Conflict ${conflict.id} references missing fact ${factId}.`);
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const parseCameraDatabase = (value: unknown): CameraDatabase => {
  const validation = validateCameraDatabase(value);
  if (!validation.isValid || !isCameraDatabase(value)) {
    throw new Error(validation.errors.join(" ") || "Camera database validation failed.");
  }
  return value;
};
