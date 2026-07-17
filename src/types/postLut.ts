import type { ColorEncodingProfileId, ColorProfileSource, RgbColor } from "./index";

export type InterpretationConfidence = "confirmed" | "inferred" | "unknown";

export interface ImageColorInterpretation {
  readonly profileId: ColorEncodingProfileId;
  readonly confidence: InterpretationConfidence;
  readonly source: ColorProfileSource;
  readonly note: string;
  readonly headerSuggestedProfileId?: ColorEncodingProfileId;
  readonly headerEvidence?: string;
}

export interface PostLutColorContract {
  readonly inputColorSpace: "Rec.709";
  readonly inputGamma: "Gamma 2.4";
  readonly outputColorSpace: "Rec.709";
  readonly outputGamma: "Gamma 2.4";
  readonly inputRange: "Full";
  readonly outputRange: "Full";
}

export interface LutConsistencyDiagnostics {
  readonly previewSource: "final-export-cube";
  readonly lutSize: 17 | 33 | 65;
  readonly dataLineCount: number;
  readonly averageRgbError: number;
  readonly maximumRgbError: number;
  readonly p95RgbError: number;
  readonly passed: boolean;
  readonly parameterHash: string;
  readonly cubeHash: string;
  readonly inputInterpretationHash: string;
  readonly inputProfileId: ColorEncodingProfileId;
  readonly outputProfileId: "bt709-g24-full";
  readonly previewDisplayTransformId: "bt709-g24-to-browser-srgb";
  readonly inputContract: string;
  readonly outputContract: string;
}

export interface PostLutPreparedData {
  readonly cubeResult: import("./index").CubeExportResult;
  readonly parameterHash: string;
  readonly cubeHash: string;
  readonly inputInterpretationHash: string;
  readonly diagnostics: LutConsistencyDiagnostics;
  readonly referenceAverageColor?: RgbColor;
}

export interface CubeDownloadArtifact {
  readonly filename: string;
  readonly text: string;
  readonly blob: Blob;
  readonly mimeType: "text/plain;charset=utf-8";
  readonly byteLength: number;
  readonly sha256: string;
  readonly parameterHash: string;
  readonly cubeHash: string;
  readonly lutSize: 17 | 33 | 65;
  readonly inputContract: string;
  readonly outputContract: string;
}

export type CubeDownloadStatus = "idle" | "preparing" | "generated" | "requested" | "blocked";

export interface SceneStressMetrics {
  readonly luminanceChange: number;
  readonly saturationChange: number;
  readonly highlightClipDelta: number;
  readonly shadowClipDelta: number;
  readonly redOverflowRisk: boolean;
  readonly skinToneShiftRisk: boolean;
  readonly skyHueRisk: boolean;
  readonly fluorescentGreenRisk: boolean;
}

export type SceneStressConclusion =
  | "适合跨场景使用"
  | "建议降低强度"
  | "更适合作为单场景 Look"
  | "存在高光风险"
  | "存在红色溢出风险";

export interface SceneStressResult {
  readonly sceneId: import("./lutValidation").LutValidationSceneId;
  readonly metrics: SceneStressMetrics;
  readonly conclusions: readonly SceneStressConclusion[];
}

export interface LutStressTestReport {
  readonly cubeHash: string;
  readonly results: readonly SceneStressResult[];
  readonly overallConclusions: readonly SceneStressConclusion[];
}

export interface PostLutStressTestAsset {
  readonly scene: import("./lutValidation").ValidationScene;
  readonly imageUrl: string;
  readonly colorInterpretation: ImageColorInterpretation;
  readonly technicalTransform?: import("./colorPipeline").TechnicalTransformBinding;
}
