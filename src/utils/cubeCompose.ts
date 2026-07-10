import type { CameraLutRange, ColorPipelineDefinition, ColorPipelineStageStatus, RgbColor, SupportedCubeSize } from "../types";
import { evaluateCubeLut } from "./cubeEvaluator";
import { applyLookToRgb } from "./cubeExport";

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

export const applyMonitorAdjustment = (color: RgbColor, brightnessOffsetEv: number): RgbColor => {
  const factor = 2 ** brightnessOffsetEv;
  if (factor === 1) {
    return color;
  }

  const mapChannel = (value: number): number => {
    const boosted = clamp01(value) * factor;
    if (boosted <= 0.9) {
      return clamp01(boosted);
    }
    return clamp01(0.9 + (1 - Math.exp(-(boosted - 0.9) * 2.4)) * 0.1);
  };

  return { r: mapChannel(color.r), g: mapChannel(color.g), b: mapChannel(color.b) };
};

export const applyRangeMapping = (color: RgbColor, range: CameraLutRange): RgbColor => {
  if (range !== "legal") {
    return { r: clamp01(color.r), g: clamp01(color.g), b: clamp01(color.b) };
  }

  const legalMin = 16 / 255;
  const legalScale = 219 / 255;
  return {
    r: legalMin + clamp01(color.r) * legalScale,
    g: legalMin + clamp01(color.g) * legalScale,
    b: legalMin + clamp01(color.b) * legalScale
  };
};

export const applyColorPipelineToRgb = (input: RgbColor, pipeline: ColorPipelineDefinition): RgbColor => {
  const technicalColor =
    pipeline.inputTechnicalTransform === undefined ? input : evaluateCubeLut(pipeline.inputTechnicalTransform.parsedLut, input);
  const creativeColor = applyLookToRgb(
    technicalColor,
    pipeline.creativeLookTransform.adjustments,
    pipeline.creativeLookTransform.referenceAverageColor
  );
  const displayColor =
    pipeline.displayOutputTransform === undefined ? creativeColor : evaluateCubeLut(pipeline.displayOutputTransform, creativeColor);
  const monitorColor = applyMonitorAdjustment(displayColor, pipeline.monitorAdjustment.brightnessOffsetEv);
  return applyRangeMapping(monitorColor, pipeline.rangeMapping);
};

export const composeCubeSamples = (size: SupportedCubeSize, pipeline: ColorPipelineDefinition): readonly RgbColor[] => {
  const samples: RgbColor[] = [];
  const maxIndex = size - 1;

  for (let blueIndex = 0; blueIndex < size; blueIndex += 1) {
    const b = blueIndex / maxIndex;
    for (let greenIndex = 0; greenIndex < size; greenIndex += 1) {
      const g = greenIndex / maxIndex;
      for (let redIndex = 0; redIndex < size; redIndex += 1) {
        const r = redIndex / maxIndex;
        samples.push(applyColorPipelineToRgb({ r, g, b }, pipeline));
      }
    }
  }

  return samples;
};

export const describeColorPipeline = (pipeline: ColorPipelineDefinition): readonly ColorPipelineStageStatus[] => [
  {
    id: "input-technical",
    label: "输入技术转换",
    detail:
      pipeline.inputTechnicalTransform === undefined
        ? "未绑定，当前输入不会执行 Log 技术转换"
        : `${pipeline.inputTechnicalTransform.fileName} → ${pipeline.inputTechnicalTransform.outputSpace}`,
    active: pipeline.inputTechnicalTransform !== undefined,
    verification: pipeline.inputTechnicalTransform?.verification ?? "none"
  },
  { id: "creative-look", label: "创意风格", detail: "当前工作台参数与参考图色彩", active: true },
  {
    id: "display-output",
    label: "显示输出变换",
    detail: pipeline.displayOutputTransform === undefined ? "由输入技术 LUT 的目标输出或当前显示空间承担" : pipeline.displayOutputTransform.title ?? "本地显示 LUT",
    active: pipeline.displayOutputTransform !== undefined
  },
  {
    id: "monitor-adjustment",
    label: "监看亮度",
    detail: `${pipeline.monitorAdjustment.brightnessOffsetEv >= 0 ? "+" : ""}${pipeline.monitorAdjustment.brightnessOffsetEv} EV（用户选择）`,
    active: pipeline.monitorAdjustment.brightnessOffsetEv !== 0
  },
  {
    id: "range-mapping",
    label: "Range",
    detail: pipeline.rangeMapping === "legal" ? "Legal Range" : pipeline.rangeMapping === "full" ? "Full Range" : "自动 / 未知（当前按 Full 输出）",
    active: true
  }
];
