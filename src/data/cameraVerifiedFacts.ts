import type { CameraBrand, CameraVerifiedFact } from "../types";
import { getCameraDataSourceIdsForModel } from "./cameraDataSources";

interface PendingFactInput {
  readonly brand: CameraBrand;
  readonly model: string;
  readonly id: string;
}

const createPendingFact = ({ brand, model, id }: PendingFactInput): CameraVerifiedFact => ({
  id,
  brand,
  model,
  category: "other",
  field: "verification-registry",
  value: "pending official evidence collection",
  sourceIds: getCameraDataSourceIdsForModel(brand, model),
  confidence: "unknown",
  notes: "This is a registry placeholder, not a camera capability, technical specification or exposure recommendation."
});

export const cameraVerifiedFacts: readonly CameraVerifiedFact[] = [
  createPendingFact({ brand: "sony", model: "A6700", id: "sony-a6700-verification-registry" }),
  createPendingFact({ brand: "sony", model: "FX3", id: "sony-fx3-verification-registry" }),
  createPendingFact({ brand: "panasonic", model: "S5 IIX", id: "panasonic-s5-iix-verification-registry" })
];

export const getCameraVerifiedFactsForModel = (brand: CameraBrand, model: string): readonly CameraVerifiedFact[] =>
  cameraVerifiedFacts.filter((fact) => fact.brand === brand && fact.model === model);

export const getCameraVerifiedFactIdsForModel = (brand: CameraBrand, model: string): readonly string[] =>
  getCameraVerifiedFactsForModel(brand, model).map((fact) => fact.id);
