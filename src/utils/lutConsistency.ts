import type {
  ColorPreviewAdjustments,
  ImageColorInterpretation,
  ImageColorStatistics,
  InputColorConfig,
  LutConsistencyDiagnostics,
  LutStressTestReport,
  ParsedCubeLut,
  PostLutColorContract,
  RgbColor,
  SceneStressConclusion,
  SceneStressResult,
  ValidationScene
} from "../types";
import { applyLookToRgb } from "./cubeExport";
import { evaluateCubeLut } from "./cubeEvaluator";
import { sha256Hex, stableSerialize } from "./contentHash";

export const POST_LUT_COLOR_CONTRACT: PostLutColorContract = {
  inputColorSpace: "Rec.709",
  inputGamma: "Gamma 2.4",
  outputColorSpace: "Rec.709",
  outputGamma: "Gamma 2.4",
  inputRange: "Full",
  outputRange: "Full"
};

interface ParameterHashInput {
  readonly adjustments: ColorPreviewAdjustments;
  readonly lutSize: number;
  readonly referenceAverageColor?: RgbColor;
  readonly contract?: PostLutColorContract;
}

export const createPostParameterHash = async (input: ParameterHashInput): Promise<string> => {
  return sha256Hex(stableSerialize({
    adjustments: input.adjustments,
    lutSize: input.lutSize,
    referenceAverageColor: input.referenceAverageColor ?? null,
    contract: input.contract ?? POST_LUT_COLOR_CONTRACT
  }));
};

export const createCubeContentHash = async (content: string): Promise<string> => sha256Hex(content);

export const createInputInterpretationHash = async (interpretation: ImageColorInterpretation): Promise<string> => {
  return sha256Hex(stableSerialize({
    profileId: interpretation.profileId,
    confidence: interpretation.confidence,
    source: interpretation.source,
    headerSuggestedProfileId: interpretation.headerSuggestedProfileId ?? null,
    headerEvidence: interpretation.headerEvidence ?? null
  }));
};

export const createPostConfigurationSignature = (input: {
  readonly adjustments: ColorPreviewAdjustments;
  readonly lutSize: number;
  readonly lutName: string;
  readonly lookName: string;
  readonly inputColorConfig: InputColorConfig;
  readonly referenceKey: string;
  readonly targetKey: string;
  readonly technicalTransformKey: string;
  readonly targetInterpretation: ImageColorInterpretation;
  readonly referenceInterpretation: ImageColorInterpretation;
}): string => stableSerialize(input);

const percentile = (values: readonly number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
};

export const calculateCubeConsistency = (
  lut: ParsedCubeLut,
  adjustments: ColorPreviewAdjustments,
  parameterHash: string,
  cubeHash: string,
  referenceAverageColor?: RgbColor,
  inputInterpretationHash = "not-calculated",
  inputProfileId: ImageColorInterpretation["profileId"] = "bt709-g24-full"
): LutConsistencyDiagnostics => {
  const sampleValues = [0, 0.03, 0.08, 0.18, 0.33, 0.5, 0.66, 0.82, 0.95, 1];
  const errors: number[] = [];
  let maximumRgbError = 0;

  for (const b of sampleValues) {
    for (const g of sampleValues) {
      for (const r of sampleValues) {
        const input = { r, g, b };
        const expected = applyLookToRgb(input, adjustments, referenceAverageColor);
        const actual = evaluateCubeLut(lut, input);
        const channelErrors = [Math.abs(actual.r - expected.r), Math.abs(actual.g - expected.g), Math.abs(actual.b - expected.b)];

        channelErrors.forEach((error) => {
          errors.push(error);
          maximumRgbError = Math.max(maximumRgbError, error);
        });
      }
    }
  }

  const averageRgbError = errors.reduce((total, error) => total + error, 0) / Math.max(1, errors.length);
  const p95RgbError = percentile(errors, 0.95);
  const maximumThreshold = lut.size === 17 ? 0.06 : lut.size === 33 ? 0.045 : 0.04;
  const averageThreshold = lut.size === 17 ? 0.006 : lut.size === 33 ? 0.0035 : 0.002;
  const p95Threshold = lut.size === 17 ? 0.012 : lut.size === 33 ? 0.006 : 0.003;

  return {
    previewSource: "final-export-cube",
    lutSize: lut.size,
    dataLineCount: lut.data.length,
    averageRgbError,
    maximumRgbError,
    p95RgbError,
    passed: averageRgbError <= averageThreshold && p95RgbError <= p95Threshold && maximumRgbError <= maximumThreshold,
    parameterHash,
    cubeHash,
    inputInterpretationHash,
    inputProfileId,
    outputProfileId: "bt709-g24-full",
    previewDisplayTransformId: "bt709-g24-to-browser-srgb",
    inputContract: "Rec.709 / Gamma 2.4 / Full",
    outputContract: "Rec.709 / Gamma 2.4 / Full"
  };
};

const sceneConclusions = (
  scene: ValidationScene,
  before: ImageColorStatistics,
  after: ImageColorStatistics
): SceneStressResult => {
  const luminanceChange = after.luminanceAverage - before.luminanceAverage;
  const saturationChange = after.saturationAverage - before.saturationAverage;
  const highlightClipDelta = after.highlightClipRatio - before.highlightClipRatio;
  const shadowClipDelta = after.blackClipRatio - before.blackClipRatio;
  const redOverflowRisk = after.highSaturationRedRatio >= Math.max(0.025, before.highSaturationRedRatio + 0.015);
  const skinToneShiftRisk = scene.defaultSkinProtection && Math.abs(after.midtones.average.r - before.midtones.average.r) > 0.12;
  const skyHueRisk = (scene.id === "blue-sky" || scene.id === "blue-sky-greenery") && Math.abs(after.highlights.average.g - before.highlights.average.g) > 0.1;
  const fluorescentGreenRisk = scene.id === "blue-sky-greenery" && after.saturationP95 > 0.92 && after.midtones.average.g > after.midtones.average.r * 1.28;
  const conclusions: SceneStressConclusion[] = [];

  if (highlightClipDelta > 0.015) {
    conclusions.push("存在高光风险");
  }
  if (redOverflowRisk) {
    conclusions.push("存在红色溢出风险");
  }
  if (Math.abs(luminanceChange) > 0.12 || saturationChange > 0.18 || skinToneShiftRisk || skyHueRisk || fluorescentGreenRisk) {
    conclusions.push("建议降低强度");
  }
  if (conclusions.length === 0) {
    conclusions.push("适合跨场景使用");
  } else if (conclusions.length >= 3 || shadowClipDelta > 0.02) {
    conclusions.push("更适合作为单场景 Look");
  }

  return {
    sceneId: scene.id,
    metrics: {
      luminanceChange,
      saturationChange,
      highlightClipDelta,
      shadowClipDelta,
      redOverflowRisk,
      skinToneShiftRisk,
      skyHueRisk,
      fluorescentGreenRisk
    },
    conclusions
  };
};

export const createLutStressTestReport = (
  cubeHash: string,
  entries: readonly {
    readonly scene: ValidationScene;
    readonly before: ImageColorStatistics;
    readonly after: ImageColorStatistics;
  }[]
): LutStressTestReport => {
  const results = entries.map((entry) => sceneConclusions(entry.scene, entry.before, entry.after));
  const overall = new Set<SceneStressConclusion>();
  results.forEach((result) => result.conclusions.forEach((conclusion) => overall.add(conclusion)));

  return {
    cubeHash,
    results,
    overallConclusions: [...overall]
  };
};
