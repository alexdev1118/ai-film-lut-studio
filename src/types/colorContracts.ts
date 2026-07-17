import type { RgbColor } from "./index";

export type ColorEncodingProfileId =
  | "srgb-full"
  | "bt709-g24-full"
  | "bt709-g24-legal"
  | "bt709-g22-full"
  | "dci-p3-g26-full"
  | "display-p3-srgb-full"
  | "unknown-manual"
  | "camera-log-unconverted";

export type ColorPrimaries = "bt709" | "dci-p3" | "display-p3" | "camera-native" | "unknown";

export type TransferFunction = "srgb" | "bt1886-gamma24" | "gamma22" | "gamma26" | "camera-log" | "unknown";

export type SignalRange = "full" | "legal" | "unknown";

export type MatrixCoefficients = "identity-rgb" | "bt709" | "unknown";

export type ColorProfileStatus = "supported" | "experimental" | "warning-only";

export type ColorProfileSource = "standards-defined" | "header-suggestion" | "user-confirmed" | "legacy-migration" | "unknown";

export type ColorContainer = "jpg" | "png" | "webp" | "tiff" | "dpx" | "video-frame";

export interface DaVinciColorSettings {
  readonly inputColorSpace: string;
  readonly inputGamma: string;
  readonly dataLevels: "Full" | "Video" | "Auto";
  readonly note: string;
}

export interface ColorEncodingProfile {
  readonly id: ColorEncodingProfileId;
  readonly displayName: string;
  readonly primaries: ColorPrimaries;
  readonly transferFunction: TransferFunction;
  readonly range: SignalRange;
  readonly matrix: MatrixCoefficients;
  readonly sceneOrDisplayReferred: "scene-referred" | "display-referred" | "unknown";
  readonly intendedUse: string;
  readonly validContainers: readonly ColorContainer[];
  readonly confidence: "high" | "medium" | "low";
  readonly sourceStatus: ColorProfileSource;
  readonly status: ColorProfileStatus;
  readonly enabledForPostExport: boolean;
  readonly enabledForPreviewOnly: boolean;
  readonly warning: string;
  readonly recommendedDaVinciSettings: DaVinciColorSettings;
}

export interface PostLutContract {
  readonly id: "post-bt709-g24-full";
  readonly displayName: "Rec.709 / Gamma 2.4 / Full";
  readonly inputProfileId: "bt709-g24-full";
  readonly outputProfileId: "bt709-g24-full";
  readonly intendedUse: string;
  readonly prohibitedUse: string;
}

export interface PreviewDisplayTransform {
  readonly id: "bt709-g24-to-browser-srgb";
  readonly sourceProfileId: "bt709-g24-full";
  readonly destinationProfileId: "srgb-full";
  readonly displayAssumption: string;
  readonly limitation: string;
}

export interface ColorConversionResult {
  readonly color: RgbColor;
  readonly sourceProfileId: ColorEncodingProfileId;
  readonly destinationProfileId: ColorEncodingProfileId;
  readonly reliable: boolean;
  readonly warning?: string;
}

export type RoundTripDiagnosis =
  | "lut-values-consistent"
  | "input-profile-mismatch"
  | "range-mismatch-suspected"
  | "gamma-mismatch-suspected"
  | "viewer-only-difference-suspected"
  | "unknown-display-pipeline-difference";

export interface RoundTripComparisonResult {
  readonly width: number;
  readonly height: number;
  readonly pixelCount: number;
  readonly rgbMeanAbsoluteError: number;
  readonly linearLightMeanAbsoluteError: number;
  readonly p95Error: number;
  readonly p99Error: number;
  readonly p999Error: number;
  readonly maximumError: number;
  readonly channelSampleCount: number;
  readonly channelErrorAbove025Count: number;
  readonly channelErrorAbove04Count: number;
  readonly channelErrorAbove08Count: number;
  readonly neutralGrayError: number;
  readonly luminanceError: number;
  readonly saturationError: number;
  readonly darkRegionError: number;
  readonly midtoneRegionError: number;
  readonly highlightRegionError: number;
  readonly diagnosis: RoundTripDiagnosis;
  readonly passed: boolean;
  readonly notes: readonly string[];
}
