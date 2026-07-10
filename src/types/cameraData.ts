import type { CameraBrand, CameraDataConfidenceLevel, CameraDataVerificationStatus, CameraProfileCategory, SensorFormat } from "./index";

export type CameraDatabaseSourceType =
  | "official-manual"
  | "official-support-page"
  | "official-lut-download"
  | "official-white-paper"
  | "official-firmware-note"
  | "community-test"
  | "user-feedback"
  | "internal-assumption";

export type CameraFactCategory =
  | "product-category"
  | "sensor-format"
  | "sensor-dimensions"
  | "gamma"
  | "gamut"
  | "lut-format"
  | "lut-size"
  | "lut-slots"
  | "import-path"
  | "file-name-limit"
  | "monitoring-only"
  | "baked-recording"
  | "range"
  | "native-iso"
  | "cine-ei"
  | "exposure-guidance"
  | "firmware"
  | "technical-lut"
  | "workflow"
  | "other";

export type CameraFactValue = string | number | boolean | readonly string[] | readonly number[];
export type CameraCoverageState = "verified" | "partial" | "pending" | "conflicting";
export type VendorLutLicenseStatus = "redistribution-allowed" | "redistribution-prohibited" | "redistribution-unknown";
export type VendorLutVerificationStatus = "verified-official" | "official-metadata-only" | "user-supplied-unverified";

export interface CameraFirmwareScope {
  readonly status: "documented" | "unknown";
  readonly minVersion?: string;
  readonly maxVersion?: string;
  readonly exactVersions?: readonly string[];
  readonly notes: string;
}

export interface CameraBrandRecord {
  readonly id: CameraBrand;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly sourceIds: readonly string[];
  readonly coverageState: CameraCoverageState;
}

export interface CameraLogProfile {
  readonly gamma: string;
  readonly sourceIds: readonly string[];
  readonly verificationStatus: CameraDataVerificationStatus;
}

export interface CameraGamutProfile {
  readonly gamut: string;
  readonly compatibleGammas: readonly string[];
  readonly sourceIds: readonly string[];
  readonly verificationStatus: CameraDataVerificationStatus;
}

export interface CameraLutCapability {
  readonly userLutImport: boolean | "unknown";
  readonly userLutFileFormats: readonly string[] | "unknown";
  readonly supportedCubeSizes: readonly (17 | 33 | 65)[] | "unknown";
  readonly fileNameLimit: number | "unknown";
  readonly cardPath: readonly string[] | "unknown";
  readonly slotCount: number | "unknown";
  readonly rangeSupport: readonly string[] | "unknown";
}

export interface CameraMonitoringCapability {
  readonly displayLut: boolean | "unknown";
  readonly monitorOnlySupport: boolean | "unknown";
  readonly gammaDisplayAssist: boolean | "unknown";
}

export interface CameraRecordingCapability {
  readonly bakedRecordingSupport: boolean | "unknown";
  readonly stillPhotoLutSupport: boolean | "unknown";
  readonly videoLutSupport: boolean | "unknown";
  readonly embeddedLutMetadata: boolean | "unknown";
}

export interface CameraExposureFact {
  readonly baseIsoOrEi: readonly string[] | "unknown";
  readonly officialExposureGuidance: readonly string[] | "unknown";
  readonly sourceIds: readonly string[];
}

export interface CameraModelRecord {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly model: string;
  readonly aliases: readonly string[];
  readonly productCategory: CameraProfileCategory;
  readonly sensorFormat: SensorFormat;
  readonly sensorDimensions: { readonly widthMm: number; readonly heightMm: number } | "unknown";
  readonly firmwareScope: readonly CameraFirmwareScope[];
  readonly supportedGammas: readonly CameraLogProfile[] | "unknown";
  readonly supportedGamuts: readonly CameraGamutProfile[] | "unknown";
  readonly lutCapability: CameraLutCapability;
  readonly monitoringCapability: CameraMonitoringCapability;
  readonly recordingCapability: CameraRecordingCapability;
  readonly exposure: CameraExposureFact;
  readonly officialTechnicalLutIds: readonly string[];
  readonly verifiedFactIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly communityNoteIds: readonly string[];
  readonly unresolvedFields: readonly string[];
  readonly confidenceLevel: CameraDataConfidenceLevel;
  readonly lastVerifiedAt?: string;
}

export interface CameraDatabaseSource {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly modelScope: readonly string[];
  readonly publisher: string;
  readonly documentTitle: string;
  readonly sourceType: CameraDatabaseSourceType;
  readonly documentVersion?: string;
  readonly firmwareScope: readonly string[];
  readonly publishedAt?: string;
  readonly accessedAt: string;
  readonly sourceUrl: string;
  readonly verificationStatus: CameraDataVerificationStatus;
  readonly shortEvidenceSummary: string;
  readonly conflictingSourceIds: readonly string[];
  readonly notes: string;
}

export interface CameraDatabaseFact {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly modelId: string;
  readonly category: CameraFactCategory;
  readonly field: string;
  readonly value: CameraFactValue;
  readonly unit?: string;
  readonly sourceIds: readonly string[];
  readonly confidenceLevel: CameraDataConfidenceLevel;
  readonly verifiedStatus: CameraDataVerificationStatus;
  readonly firmwareScope: readonly string[];
  readonly shortEvidenceSummary: string;
  readonly conflictingSourceIds: readonly string[];
  readonly notes: string;
  readonly lastVerifiedAt: string;
}

export interface CameraCommunityNote {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly modelId: string;
  readonly firmware: string;
  readonly logGamut: string;
  readonly useCase: string;
  readonly exposureMeasurement: string;
  readonly monitoringConditions: string;
  readonly recommendation: string;
  readonly sourceUrl: string;
  readonly observedAt: string;
  readonly independentSourceCount: number;
  readonly conflictsWithOfficialFacts: boolean;
  readonly officialStatus: "not-official";
}

export interface CameraDataConflict {
  readonly id: string;
  readonly modelId: string;
  readonly field: string;
  readonly factIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly status: "open" | "resolved";
  readonly resolution?: string;
}

export interface VendorLutAsset {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly modelIds: readonly string[];
  readonly title: string;
  readonly downloadPageUrl: string;
  readonly fileName: string | "unknown";
  readonly version: string | "unknown";
  readonly inputGamma: string;
  readonly inputGamut: string;
  readonly outputSpace: string;
  readonly fileFormat: ".cube" | ".vlt" | ".zip" | "unknown";
  readonly cubeSizes: readonly number[] | "unknown";
  readonly sha256?: string;
  readonly licenseStatus: VendorLutLicenseStatus;
  readonly redistributionAllowed: boolean;
  readonly verificationStatus: VendorLutVerificationStatus;
  readonly sourceIds: readonly string[];
}

export interface CameraCoverageStatus {
  readonly modelId: string;
  readonly officialSourceCount: number;
  readonly verifiedFactCount: number;
  readonly communityNoteCount: number;
  readonly unresolvedFieldCount: number;
  readonly conflictCount: number;
  readonly technicalTransformAllowed: boolean;
  readonly coverageState: CameraCoverageState;
}

export interface CameraDatabase {
  readonly brands: readonly CameraBrandRecord[];
  readonly models: readonly CameraModelRecord[];
  readonly sources: readonly CameraDatabaseSource[];
  readonly facts: readonly CameraDatabaseFact[];
  readonly communityNotes: readonly CameraCommunityNote[];
  readonly conflicts: readonly CameraDataConflict[];
  readonly vendorLutAssets: readonly VendorLutAsset[];
}
