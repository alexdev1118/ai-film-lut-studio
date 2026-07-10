import type { CameraLutRange, ColorPreviewAdjustments, RgbColor } from "./index";

export type SupportedCubeSize = 17 | 33 | 65;

export type TechnicalTransformVerification = "none" | "user-supplied-unverified" | "verified-official";

export interface ParsedCubeLut {
  readonly title?: string;
  readonly size: SupportedCubeSize;
  readonly domainMin: RgbColor;
  readonly domainMax: RgbColor;
  readonly data: readonly RgbColor[];
  readonly comments: readonly string[];
}

export interface CubeParseResult {
  readonly lut: ParsedCubeLut;
  readonly warnings: readonly string[];
}

export interface TechnicalTransformBinding {
  readonly fileName: string;
  readonly fileSize: number;
  readonly sha256: string;
  readonly parsedLut: ParsedCubeLut;
  readonly modelId: string;
  readonly inputGamma: string;
  readonly inputGamut: string;
  readonly outputSpace: string;
  readonly verification: TechnicalTransformVerification;
  readonly assetId?: string;
  readonly sourceId?: string;
  readonly sourceTitle?: string;
  readonly importedAt: string;
}

export interface TechnicalTransformImportParams {
  readonly file: File;
  readonly modelId: string;
  readonly inputGamma: string;
  readonly inputGamut: string;
}

export interface TechnicalTransformImportResult {
  readonly binding: TechnicalTransformBinding;
  readonly warnings: readonly string[];
}

export interface MonitorAdjustment {
  readonly brightnessOffsetEv: number;
}

export interface ColorPipelineDefinition {
  readonly inputTechnicalTransform?: TechnicalTransformBinding;
  readonly creativeLookTransform: {
    readonly adjustments: ColorPreviewAdjustments;
    readonly referenceAverageColor?: RgbColor;
  };
  readonly displayOutputTransform?: ParsedCubeLut;
  readonly monitorAdjustment: MonitorAdjustment;
  readonly rangeMapping: CameraLutRange;
}

export interface ColorPipelineStageStatus {
  readonly id: "input-technical" | "creative-look" | "display-output" | "monitor-adjustment" | "range-mapping";
  readonly label: string;
  readonly detail: string;
  readonly active: boolean;
  readonly verification?: TechnicalTransformVerification;
}

export interface TechnicalTransformRegistryMatch {
  readonly assetId: string;
  readonly title: string;
  readonly sourceId?: string;
  readonly inputGamma: string;
  readonly inputGamut: string;
  readonly outputSpace: string;
  readonly expectedSha256?: string;
  readonly supportedCubeSizes: readonly number[] | "unknown";
  readonly officialMetadataVerified: boolean;
}
