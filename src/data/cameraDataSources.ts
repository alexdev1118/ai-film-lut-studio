import type { CameraBrand, CameraDataSource } from "../types";

interface PendingVerificationSourceInput {
  readonly brand: CameraBrand;
  readonly model: string;
  readonly prefix: string;
}

const createPendingVerificationSources = ({ brand, model, prefix }: PendingVerificationSourceInput): readonly CameraDataSource[] => [
  {
    id: `${prefix}-official-manual`,
    brand,
    model,
    documentTitle: "Pending official manual",
    sourceType: "internal-assumption",
    verificationStatus: "unverified",
    notes: "Evidence registry entry only. An official manual has not been recorded or reviewed in this project."
  },
  {
    id: `${prefix}-firmware-verification`,
    brand,
    model,
    documentTitle: "Pending firmware-specific verification",
    sourceType: "internal-assumption",
    verificationStatus: "unverified",
    notes: "Evidence registry entry only. No firmware-specific capability conclusion has been recorded."
  },
  {
    id: `${prefix}-lut-import-specification`,
    brand,
    model,
    documentTitle: "Pending LUT import specification",
    sourceType: "internal-assumption",
    verificationStatus: "unverified",
    notes: "Evidence registry entry only. LUT format, point count, range, slot and import path remain unverified."
  },
  {
    id: `${prefix}-exposure-guidance`,
    brand,
    model,
    documentTitle: "Pending exposure guidance verification",
    sourceType: "internal-assumption",
    verificationStatus: "unverified",
    notes: "Evidence registry entry only. No ISO, Zebra, middle-gray, white-clip, EI or ETTR conclusion has been recorded."
  }
];

export const cameraDataSources: readonly CameraDataSource[] = [
  ...createPendingVerificationSources({ brand: "sony", model: "A6700", prefix: "sony-a6700" }),
  ...createPendingVerificationSources({ brand: "sony", model: "FX3", prefix: "sony-fx3" }),
  ...createPendingVerificationSources({ brand: "panasonic", model: "S5 IIX", prefix: "panasonic-s5-iix" })
];

export const getCameraDataSourcesForModel = (brand: CameraBrand, model: string): readonly CameraDataSource[] =>
  cameraDataSources.filter((source) => source.brand === brand && source.model === model);

export const getCameraDataSourceIdsForModel = (brand: CameraBrand, model: string): readonly string[] =>
  getCameraDataSourcesForModel(brand, model).map((source) => source.id);
