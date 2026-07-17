import type { ColorPreviewAdjustments, RgbColor } from "../types";
import { applyLookToRgbWithDiagnostics } from "./cubeExport";
import { getOklabChroma, getOklabHueDegrees, hueDistanceDegrees } from "./gamutCompression";

export interface LutStrengthDiagnostics {
  readonly sampleCount: number;
  readonly preCompressionOutOfGamutRatio: number;
  readonly postCompressionOutOfGamutRatio: number;
  readonly clippedChannelRatio: number;
  readonly neutralAxisError: number;
  readonly hueDriftP95: number;
  readonly skinHueError: number;
  readonly maximumChromaReduction: number;
}

const percentile = (values: readonly number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(ordered.length * ratio) - 1));
  return ordered[index] ?? 0;
};

const channelSpread = (color: RgbColor): number => Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);

const isSkinLikeColor = (color: RgbColor): boolean => {
  const maximum = Math.max(color.r, color.g, color.b);
  const minimum = Math.min(color.r, color.g, color.b);
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  return color.r > color.b
    && color.r > color.g * 0.9
    && color.g > color.b * 0.72
    && maximum - minimum > 18 / 255
    && luminance > 0.22
    && luminance < 0.82;
};

const isBoundaryChannel = (value: number): boolean => value <= 1e-8 || value >= 1 - 1e-8;

export const analyzeLutStrengthDiagnostics = (
  samples: readonly RgbColor[],
  adjustments: ColorPreviewAdjustments,
  referenceAverageColor?: RgbColor
): LutStrengthDiagnostics => {
  if (samples.length === 0) {
    throw new Error("LUT strength diagnostics require at least one RGB sample.");
  }

  let preCompressionOutOfGamutCount = 0;
  let postCompressionOutOfGamutCount = 0;
  let clippedChannelCount = 0;
  let maximumChromaReduction = 0;
  const neutralErrors: number[] = [];
  const hueDrifts: number[] = [];
  const skinHueErrors: number[] = [];

  for (const sample of samples) {
    const application = applyLookToRgbWithDiagnostics(sample, adjustments, referenceAverageColor);
    const output = application.color;
    if (application.diagnostics.preCompressionOutOfGamut) {
      preCompressionOutOfGamutCount += 1;
    }
    if (application.diagnostics.postCompressionOutOfGamut) {
      postCompressionOutOfGamutCount += 1;
    }
    clippedChannelCount += [output.r, output.g, output.b].filter(isBoundaryChannel).length;
    maximumChromaReduction = Math.max(maximumChromaReduction, application.diagnostics.chromaReduction);

    if (channelSpread(sample) <= 0.01) {
      neutralErrors.push(channelSpread(output));
    }

    if (getOklabChroma(sample) >= 0.04 && getOklabChroma(output) >= 0.02) {
      const hueError = hueDistanceDegrees(getOklabHueDegrees(sample), getOklabHueDegrees(output));
      hueDrifts.push(hueError);
      if (isSkinLikeColor(sample)) {
        skinHueErrors.push(hueError);
      }
    }
  }

  return {
    sampleCount: samples.length,
    preCompressionOutOfGamutRatio: preCompressionOutOfGamutCount / samples.length,
    postCompressionOutOfGamutRatio: postCompressionOutOfGamutCount / samples.length,
    clippedChannelRatio: clippedChannelCount / (samples.length * 3),
    neutralAxisError: neutralErrors.length === 0 ? 0 : neutralErrors.reduce((total, value) => total + value, 0) / neutralErrors.length,
    hueDriftP95: percentile(hueDrifts, 0.95),
    skinHueError: percentile(skinHueErrors, 0.95),
    maximumChromaReduction
  };
};
