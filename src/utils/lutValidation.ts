import type { ColorPipelineDefinition, LutParameters } from "../types";
import type {
  AnalysisParameterSnapshot,
  AutoAnalysisInput,
  AutoColorAnalysisResult,
  AutoColorSuggestion,
  ImageColorStatistics,
  InputReadinessResult,
  LutValidationReport,
  SuggestedLutParameters,
  ValidationScene
} from "../types/lutValidation";
import { applyColorPipelineToRgb } from "./cubeCompose";
import { analyzeRgbaPixels } from "./colorAnalysis";

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const round = (value: number): number => Math.round(value);

const getContrastSpan = (statistics: ImageColorStatistics): number => statistics.luminance.p95 - statistics.luminance.p05;

const hasStrongHighlightRisk = (statistics: ImageColorStatistics): boolean =>
  statistics.highlightClipRatio >= 0.015 || statistics.luminance.p95 >= 0.985;

const hasStrongShadowRisk = (statistics: ImageColorStatistics): boolean =>
  statistics.blackClipRatio >= 0.02 || statistics.luminance.p05 <= 0.012;

export const getInputReadiness = ({ inputColorConfig, technicalTransform }: AutoAnalysisInput): InputReadinessResult => {
  if (inputColorConfig.inputType === "rec709" && inputColorConfig.canUseCreativeLutDirectly) {
    return {
      readiness: "ready",
      confidence: "high",
      summary: "当前输入为 Rec.709 / Standard，可直接进行创意仿色分析。",
      risks: []
    };
  }

  if (inputColorConfig.inputType === "log") {
    if (technicalTransform?.verification === "verified-official") {
      return {
        readiness: "ready",
        confidence: "high",
        summary: "当前 Log 输入已绑定经核验的技术转换，自动建议将基于转换后的预览方向生成。",
        risks: []
      };
    }

    return {
      readiness: "experimental-log",
      confidence: "low",
      summary: "当前为 Log 输入，建议先完成技术还原后再生成 POST 创意 LUT。此处仅提供不可靠的实验性预览建议。",
      risks: ["未应用经核验的技术还原，网页预览不能代表正确的 Rec.709 工作流。"]
    };
  }

  return {
    readiness: "unconfirmed",
    confidence: inputColorConfig.inputType === "unknown" ? "low" : "medium",
    summary: "输入状态未确认，自动建议仅用于本地观察，不会声明适合直接用于 Rec.709。",
    risks: ["请确认素材的 Gamma、Gamut 与技术还原流程。"]
  };
};

export const createAutoColorAnalysis = (
  target: ImageColorStatistics,
  reference: ImageColorStatistics,
  input: AutoAnalysisInput
): AutoColorAnalysisResult => {
  const readiness = getInputReadiness(input);
  const exposureDifference = reference.luminance.p50 - target.luminance.p50;
  const temperatureDifference = reference.temperatureBias - target.temperatureBias;
  const tintDifference = reference.tintBias - target.tintBias;
  const saturationDifference = reference.saturationAverage - target.saturationAverage;
  const risks = [...readiness.risks];

  if (hasStrongShadowRisk(target)) {
    risks.push("目标素材阴影接近裁切，建议避免继续压黑。 ");
  }
  if (hasStrongHighlightRisk(target)) {
    risks.push("目标素材高光接近裁切，建议避免继续抬高高光。 ");
  }
  if (target.highSaturationRedRatio >= 0.02 || reference.highSaturationRedRatio >= 0.02) {
    risks.push("检测到高饱和红色区域，建议启用防止过度饱和。 ");
  }
  if (input.scene?.id === "blue-sky" || input.scene?.id === "blue-sky-greenery") {
    risks.push("天空场景建议限制色温和 Tint 幅度，避免蓝色明显偏青或偏紫。 ");
  }

  return {
    target,
    reference,
    readiness: readiness.readiness,
    confidence: readiness.confidence,
    inputSummary: readiness.summary,
    exposureDifference,
    temperatureDifference,
    tintDifference,
    saturationDifference,
    risks
  };
};

const createSuggestedParameters = (current: LutParameters, analysis: AutoColorAnalysisResult): SuggestedLutParameters => {
  const target = analysis.target;
  const reference = analysis.reference;
  const exposureDelta = analysis.exposureDifference;
  const contrastDelta = (getContrastSpan(reference) - getContrastSpan(target)) * 72;
  const highRedRisk = target.highSaturationRedRatio >= 0.02 || reference.highSaturationRedRatio >= 0.02;
  const highlightRisk = hasStrongHighlightRisk(target) || hasStrongHighlightRisk(reference);
  const shadowRisk = hasStrongShadowRisk(target);
  const maximumIntensity = analysis.confidence === "high" ? 78 : analysis.confidence === "medium" ? 66 : 58;
  const suggestedSaturation = clamp(current.saturation + analysis.saturationDifference * 62, -22, highRedRisk ? 4 : 22);
  const suggestedHighlight = highlightRisk
    ? clamp(Math.max(current.highlightMatch, 55), 50, 62)
    : clamp(current.highlightMatch - exposureDelta * 14, 42, 58);
  const suggestedShadow = shadowRisk
    ? clamp(Math.max(current.shadowMatch, 52), 50, 60)
    : clamp(current.shadowMatch + exposureDelta * 28, 42, 60);

  return {
    intensity: clamp(round(current.intensity), 28, maximumIntensity),
    contrast: clamp(round(current.contrast + contrastDelta), -24, highlightRisk ? 12 : 24),
    saturation: round(suggestedSaturation),
    temperature: clamp(round(current.temperature + analysis.temperatureDifference * 58), -18, 18),
    tint: clamp(round(current.tint + analysis.tintDifference * 58), -12, 12),
    shadowMatch: round(suggestedShadow),
    midtoneMatch: round(clamp(current.midtoneMatch + exposureDelta * 36, 42, 60)),
    highlightMatch: round(suggestedHighlight)
  };
};

export const createAutoColorSuggestion = (
  current: LutParameters,
  analysis: AutoColorAnalysisResult,
  scene?: ValidationScene
): AutoColorSuggestion => {
  const highRedRisk = analysis.target.highSaturationRedRatio >= 0.02 || analysis.reference.highSaturationRedRatio >= 0.02;
  const highlightRisk = hasStrongHighlightRisk(analysis.target) || hasStrongHighlightRisk(analysis.reference);
  const shadowRisk = hasStrongShadowRisk(analysis.target);
  const rationale: string[] = [
    `亮度 P50 差异：${analysis.exposureDifference >= 0 ? "+" : ""}${analysis.exposureDifference.toFixed(3)}。`,
    `冷暖倾向差异：${analysis.temperatureDifference >= 0 ? "+" : ""}${analysis.temperatureDifference.toFixed(3)}。`,
    `平均饱和度差异：${analysis.saturationDifference >= 0 ? "+" : ""}${analysis.saturationDifference.toFixed(3)}。`
  ];

  if (analysis.readiness !== "ready") {
    rationale.push("输入状态不是已确认的 Rec.709 工作流，建议幅度已被收紧。 ");
  }
  if (scene?.defaultSkinProtection === true) {
    rationale.push("人物场景默认提高肤色保护。 ");
  }
  if (highRedRisk) {
    rationale.push("高饱和红色风险已限制饱和度建议。 ");
  }
  if (highlightRisk) {
    rationale.push("高光风险已避免提升高光，并优先保护高光。 ");
  }
  if (shadowRisk) {
    rationale.push("阴影风险已避免继续压低黑位。 ");
  }

  return {
    parameters: createSuggestedParameters(current, analysis),
    skinToneProtection: scene?.defaultSkinProtection === true,
    preserveLuma: true,
    preventOversaturation: highRedRisk,
    rationale,
    risks: analysis.risks
  };
};

export const applyAutoColorSuggestion = (current: LutParameters, suggestion: AutoColorSuggestion): LutParameters => ({
  ...current,
  ...suggestion.parameters
});

export const createAnalysisParameterSnapshot = (
  parameters: LutParameters,
  skinToneProtection: boolean,
  preserveLuma: boolean,
  preventOversaturation: boolean
): AnalysisParameterSnapshot => ({ parameters, skinToneProtection, preserveLuma, preventOversaturation });

export const restoreAnalysisParameterSnapshot = (snapshot: AnalysisParameterSnapshot): AnalysisParameterSnapshot => ({
  parameters: { ...snapshot.parameters },
  skinToneProtection: snapshot.skinToneProtection,
  preserveLuma: snapshot.preserveLuma,
  preventOversaturation: snapshot.preventOversaturation
});

export const applyColorPipelineForValidation = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pipeline: ColorPipelineDefinition
): { readonly pixels: Uint8ClampedArray; readonly rgbOutOfRangeCount: number; readonly rgbBoundaryHitCount: number } => {
  if (data.length !== width * height * 4) {
    throw new Error("验证像素长度与图像尺寸不匹配。 ");
  }

  const output = new Uint8ClampedArray(data.length);
  let rgbOutOfRangeCount = 0;
  let rgbBoundaryHitCount = 0;

  for (let index = 0; index < data.length; index += 4) {
    const transformed = applyColorPipelineToRgb(
      { r: (data[index] ?? 0) / 255, g: (data[index + 1] ?? 0) / 255, b: (data[index + 2] ?? 0) / 255 },
      pipeline
    );
    const channels = [transformed.r, transformed.g, transformed.b];

    for (const channel of channels) {
      if (channel < 0 || channel > 1 || !Number.isFinite(channel)) {
        rgbOutOfRangeCount += 1;
      }
      if (channel <= 0 || channel >= 1) {
        rgbBoundaryHitCount += 1;
      }
    }

    output[index] = Math.round(clamp(transformed.r, 0, 1) * 255);
    output[index + 1] = Math.round(clamp(transformed.g, 0, 1) * 255);
    output[index + 2] = Math.round(clamp(transformed.b, 0, 1) * 255);
    output[index + 3] = data[index + 3] ?? 255;
  }

  return { pixels: output, rgbOutOfRangeCount, rgbBoundaryHitCount };
};

export const createLutValidationReport = (
  scene: ValidationScene,
  inputReadiness: AutoColorAnalysisResult["readiness"],
  before: ImageColorStatistics,
  after: ImageColorStatistics,
  rgbOutOfRangeCount: number,
  rgbBoundaryHitCount: number
): LutValidationReport => {
  const highSaturationRedRisk = after.highSaturationRedRatio >= 0.02;
  const highlightRisk = hasStrongHighlightRisk(after);
  const shadowCrushRisk = hasStrongShadowRisk(after);
  const classification: string[] = [];

  if (inputReadiness === "experimental-log") {
    classification.push("技术还原问题：当前 Log 输入未绑定经核验技术转换。 ");
  }
  if (inputReadiness === "unconfirmed") {
    classification.push("输入状态未知：无法确认该结果能否直接用于 Rec.709。 ");
  }
  if (hasStrongHighlightRisk(before) || hasStrongShadowRisk(before)) {
    classification.push("原素材曝光问题：处理前已存在高光或阴影裁切风险。 ");
  }
  if (highlightRisk || shadowCrushRisk || highSaturationRedRisk || rgbBoundaryHitCount > before.pixelCount * 0.12) {
    classification.push("创意 LUT 问题：处理后存在需要收紧的高光、阴影、红色或通道边界风险。 ");
  }
  if (classification.length === 0) {
    classification.push("当前场景未触发已定义的曝光、饱和度或输入状态风险。 ");
  }

  return {
    sceneId: scene.id,
    inputReadiness,
    before,
    after,
    rgbOutOfRangeCount,
    rgbBoundaryHitCount,
    highSaturationRedRisk,
    highlightRisk,
    shadowCrushRisk,
    classification
  };
};

const percentage = (value: number): string => `${(value * 100).toFixed(2)}%`;

export const formatLutValidationMarkdown = (report: LutValidationReport): string => {
  const lines = [
    `# LUT 验证报告：${report.sceneId}`,
    "",
    `- 输入状态：${report.inputReadiness}`,
    `- 处理前亮度 P05 / P50 / P95：${report.before.luminance.p05.toFixed(3)} / ${report.before.luminance.p50.toFixed(3)} / ${report.before.luminance.p95.toFixed(3)}`,
    `- 处理后亮度 P05 / P50 / P95：${report.after.luminance.p05.toFixed(3)} / ${report.after.luminance.p50.toFixed(3)} / ${report.after.luminance.p95.toFixed(3)}`,
    `- 处理前黑位裁切：${percentage(report.before.blackClipRatio)}`,
    `- 处理后黑位裁切：${percentage(report.after.blackClipRatio)}`,
    `- 处理前高光裁切：${percentage(report.before.highlightClipRatio)}`,
    `- 处理后高光裁切：${percentage(report.after.highlightClipRatio)}`,
    `- 处理前平均饱和度 / P95：${report.before.saturationAverage.toFixed(3)} / ${report.before.saturationP95.toFixed(3)}`,
    `- 处理后平均饱和度 / P95：${report.after.saturationAverage.toFixed(3)} / ${report.after.saturationP95.toFixed(3)}`,
    `- RGB 越界数量：${report.rgbOutOfRangeCount}`,
    `- RGB 边界命中数量：${report.rgbBoundaryHitCount}`,
    `- 高饱和红色风险：${report.highSaturationRedRisk ? "是" : "否"}`,
    `- 高光风险：${report.highlightRisk ? "是" : "否"}`,
    `- 阴影堵塞风险：${report.shadowCrushRisk ? "是" : "否"}`,
    "",
    "## 风险归类",
    ...report.classification.map((entry) => `- ${entry}`)
  ];

  return lines.join("\n");
};
