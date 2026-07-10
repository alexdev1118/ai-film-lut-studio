import brands from "./brands/index.json";
import sonyModels from "./models/sony.json";
import priorityModels from "./models/priority.json";
import sonySources from "./sources/sony.json";
import prioritySources from "./sources/priority.json";
import sonyFacts from "./facts/sony.json";
import priorityFacts from "./facts/priority.json";
import communityNotes from "./community-notes/index.json";
import conflicts from "./manifests/conflicts.json";
import vendorLutAssets from "./manifests/vendor-lut-assets.json";
import { parseCameraDatabase } from "../../utils/cameraDataValidate";
import type { CameraCoverageStatus, CameraDatabaseFact, CameraDatabaseSource, CameraModelRecord } from "../../types/cameraData";

const rawCameraDatabase: unknown = {
  brands,
  models: [...sonyModels, ...priorityModels],
  sources: [...sonySources, ...prioritySources],
  facts: [...sonyFacts, ...priorityFacts],
  communityNotes,
  conflicts,
  vendorLutAssets
};

export const cameraDatabase = parseCameraDatabase(rawCameraDatabase);

export const getCameraModelRecord = (modelId: string): CameraModelRecord | undefined => cameraDatabase.models.find((model) => model.id === modelId);

export const getCameraSources = (modelId: string): readonly CameraDatabaseSource[] => cameraDatabase.sources.filter((source) => source.modelScope.includes(modelId));

export const getCameraFacts = (modelId: string): readonly CameraDatabaseFact[] => cameraDatabase.facts.filter((fact) => fact.modelId === modelId);

export const getCameraCoverageStatus = (modelId: string): CameraCoverageStatus => {
  const model = getCameraModelRecord(modelId);
  const sources = getCameraSources(modelId);
  const facts = getCameraFacts(modelId);
  const communityNoteCount = cameraDatabase.communityNotes.filter((note) => note.modelId === modelId).length;
  const conflictCount = cameraDatabase.conflicts.filter((conflict) => conflict.modelId === modelId && conflict.status === "open").length;
  const officialSourceCount = sources.filter((source) => source.sourceType.startsWith("official-")).length;
  const verifiedFactCount = facts.filter((fact) => fact.confidenceLevel === "official-confirmed" && fact.verifiedStatus === "verified").length;
  const unresolvedFieldCount = model?.unresolvedFields.length ?? 0;
  const technicalTransformAllowed =
    model !== undefined &&
    model.officialTechnicalLutIds.length > 0 &&
    model.officialTechnicalLutIds.every((assetId) =>
      cameraDatabase.vendorLutAssets.some(
        (asset) => asset.id === assetId && asset.verificationStatus === "verified-official" && asset.sha256 !== undefined
      )
    );

  return {
    modelId,
    officialSourceCount,
    verifiedFactCount,
    communityNoteCount,
    unresolvedFieldCount,
    conflictCount,
    technicalTransformAllowed,
    coverageState:
      model === undefined
        ? "pending"
        : conflictCount > 0
          ? "conflicting"
          : verifiedFactCount > 0 && unresolvedFieldCount > 0
            ? "partial"
            : unresolvedFieldCount === 0
              ? "verified"
              : "pending"
  };
};
