import type { InputColorConfig, LutParameters, RgbColor, TechnicalTransformBinding } from "../types";

export type LutValidationSceneId =
  | "portrait-normal"
  | "portrait-close"
  | "blue-sky"
  | "blue-sky-greenery"
  | "daylight-high-contrast"
  | "saturated-red";

export type LutValidationAssetRole = "log-source" | "normalized-rec709" | "target-look" | "reference-look";

export type LutInputReadiness = "ready" | "experimental-log" | "unconfirmed";

export type LutAnalysisConfidence = "low" | "medium" | "high";

export interface ValidationScene {
  readonly id: LutValidationSceneId;
  readonly label: string;
  readonly description: string;
  readonly focus: readonly string[];
  readonly defaultSkinProtection: boolean;
  readonly expectedRoles: readonly LutValidationAssetRole[];
}

export interface SceneMaterialRecord {
  readonly role: LutValidationAssetRole;
  readonly fileName: string;
  readonly sceneId: LutValidationSceneId;
  readonly inputState: LutInputReadiness;
  readonly gamma: string;
  readonly gamut: string;
  readonly width: number;
  readonly height: number;
  readonly bitDepth?: number;
  readonly technicallyNormalized: boolean;
  readonly technicalTransformSource?: string;
  readonly notes: string;
}

export interface RgbDistribution {
  readonly average: RgbColor;
  readonly median: RgbColor;
}

export interface LuminancePercentiles {
  readonly p05: number;
  readonly p25: number;
  readonly p50: number;
  readonly p75: number;
  readonly p95: number;
}

export interface ToneZoneColorStatistics {
  readonly pixelCount: number;
  readonly average: RgbColor;
  readonly averageSaturation: number;
}

export interface ImageColorStatistics {
  readonly pixelCount: number;
  readonly rgb: RgbDistribution;
  readonly luminanceAverage: number;
  readonly luminance: LuminancePercentiles;
  readonly blackClipRatio: number;
  readonly highlightClipRatio: number;
  readonly saturationAverage: number;
  readonly saturationP95: number;
  readonly temperatureBias: number;
  readonly tintBias: number;
  readonly highSaturationRedRatio: number;
  readonly shadows: ToneZoneColorStatistics;
  readonly midtones: ToneZoneColorStatistics;
  readonly highlights: ToneZoneColorStatistics;
}

export interface AutoColorAnalysisResult {
  readonly target: ImageColorStatistics;
  readonly reference: ImageColorStatistics;
  readonly readiness: LutInputReadiness;
  readonly confidence: LutAnalysisConfidence;
  readonly inputSummary: string;
  readonly exposureDifference: number;
  readonly temperatureDifference: number;
  readonly tintDifference: number;
  readonly saturationDifference: number;
  readonly risks: readonly string[];
}

export type SuggestedLutParameters = Pick<
  LutParameters,
  "intensity" | "contrast" | "saturation" | "temperature" | "tint" | "shadowMatch" | "midtoneMatch" | "highlightMatch"
>;

export interface AutoColorSuggestion {
  readonly parameters: SuggestedLutParameters;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
  readonly rationale: readonly string[];
  readonly risks: readonly string[];
}

export interface AnalysisParameterSnapshot {
  readonly parameters: LutParameters;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
}

export interface LutValidationReport {
  readonly sceneId: LutValidationSceneId;
  readonly inputReadiness: LutInputReadiness;
  readonly before: ImageColorStatistics;
  readonly after: ImageColorStatistics;
  readonly rgbOutOfRangeCount: number;
  readonly rgbBoundaryHitCount: number;
  readonly highSaturationRedRisk: boolean;
  readonly highlightRisk: boolean;
  readonly shadowCrushRisk: boolean;
  readonly classification: readonly string[];
}

export interface InputReadinessResult {
  readonly readiness: LutInputReadiness;
  readonly confidence: LutAnalysisConfidence;
  readonly summary: string;
  readonly risks: readonly string[];
}

export interface AutoAnalysisInput {
  readonly inputColorConfig: InputColorConfig;
  readonly technicalTransform?: TechnicalTransformBinding;
  readonly scene?: ValidationScene;
}
