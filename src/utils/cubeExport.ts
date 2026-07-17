import { browserPreviewDisplayTransform, postLutContract } from "../data/colorEncodingProfiles";
import type { ColorPreviewAdjustments, CubeExportResult, LutExportOptions, RgbColor } from "../types";
import {
  compressRgbToDisplayGamut,
  getOklabChroma,
  scaleRgbOklabChroma,
  stabilizeRgbHue,
  type GamutCompressionResult
} from "./gamutCompression";
import { generateLutFileName, sanitizeLutName } from "./lutNaming";

export interface LookApplicationDiagnostics {
  readonly preCompressionColor: RgbColor;
  readonly compressedFullLook: RgbColor;
  readonly preCompressionOutOfGamut: boolean;
  readonly postCompressionOutOfGamut: boolean;
  readonly clippedChannelCount: number;
  readonly chromaReduction: number;
  readonly compressionHueDriftDegrees: number;
}

export interface LookApplicationResult {
  readonly color: RgbColor;
  readonly diagnostics: LookApplicationDiagnostics;
}

const clamp01 = (value: number): number => {
  return Math.min(Math.max(value, 0), 1);
};

const smoothstep = (minimum: number, maximum: number, value: number): number => {
  const normalized = clamp01((value - minimum) / Math.max(Number.EPSILON, maximum - minimum));
  return normalized * normalized * (3 - 2 * normalized);
};

const formatCubeValue = (value: number): string => {
  return clamp01(value).toFixed(6);
};

const sanitizeLutTitle = (lutName: string): string => sanitizeLutName(lutName).replace(/["\r\n]/g, " ") || "AI_Film_LUT";

const normalizeLutSize = (lutSize: number): number => {
  if (lutSize === 17 || lutSize === 33 || lutSize === 65) {
    return lutSize;
  }

  return 33;
};

export const applyLookToRgbWithDiagnostics = (
  input: RgbColor,
  adjustments: ColorPreviewAdjustments,
  referenceAverageColor?: RgbColor
): LookApplicationResult => {
  const originalR = clamp01(input.r);
  const originalG = clamp01(input.g);
  const originalB = clamp01(input.b);
  const originalLuma = 0.299 * originalR + 0.587 * originalG + 0.114 * originalB;
  const intensity = clamp01(adjustments.intensity / 100);
  if (intensity === 0) {
    const identityColor = { r: originalR, g: originalG, b: originalB };
    return {
      color: identityColor,
      diagnostics: {
        preCompressionColor: identityColor,
        compressedFullLook: identityColor,
        preCompressionOutOfGamut: false,
        postCompressionOutOfGamut: false,
        clippedChannelCount: 0,
        chromaReduction: 0,
        compressionHueDriftDegrees: 0
      }
    };
  }
  const contrastValue = Math.min(Math.max(adjustments.contrast, -100), 100) * 1.8;
  const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
  const saturationFactor = 1 + Math.min(Math.max(adjustments.saturation, -100), 100) / 100;
  const temperatureShift = Math.min(Math.max(adjustments.temperature, -50), 50) * 1.15 / 255;
  const tintShift = Math.min(Math.max(adjustments.tint, -50), 50) * 0.9 / 255;
  const shadowShift = clamp01(adjustments.shadowMatch / 100);
  const midtoneShift = clamp01(adjustments.midtoneMatch / 100);
  const highlightShift = clamp01(adjustments.highlightMatch / 100);
  const toneResponse = adjustments.preserveLuma ? 0.66 : 1;
  const shadowAmount = (shadowShift - 0.5) * 2 * toneResponse;
  const midtoneAmount = (midtoneShift - 0.5) * 2 * toneResponse;
  const highlightAmount = (highlightShift - 0.5) * 2 * toneResponse;
  const referenceStrength = referenceAverageColor === undefined ? 0 : 0.24;
  const lumaPreserveStrength = adjustments.preserveLuma ? 0.52 : 0.18;
  let skinProtectionApplied = false;
  let r = originalR;
  let g = originalG;
  let b = originalB;

  r = contrastFactor * (r - 0.5) + 0.5;
  g = contrastFactor * (g - 0.5) + 0.5;
  b = contrastFactor * (b - 0.5) + 0.5;

  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = gray + (r - gray) * saturationFactor;
  g = gray + (g - gray) * saturationFactor;
  b = gray + (b - gray) * saturationFactor;

  r += temperatureShift;
  b -= temperatureShift;

  r += tintShift * 0.55;
  b += tintShift * 0.55;
  g -= tintShift;

  const baseToneR = r;
  const baseToneG = g;
  const baseToneB = b;
  const shadowDepth = clamp01((0.4 - originalLuma) / 0.4);
  const shadowPivot = 0.18;
  const shadowContrast = 1 + shadowAmount * (0.38 + shadowDepth * 0.22);
  const shadowLift = shadowAmount * (0.07 + shadowDepth * 0.06);
  const shadowWarmth = shadowAmount * (0.025 + shadowDepth * 0.018);
  const shadowR = (baseToneR - shadowPivot) * shadowContrast + shadowPivot + shadowLift + shadowWarmth;
  const shadowG = (baseToneG - shadowPivot) * shadowContrast + shadowPivot + shadowLift * 0.78 + shadowAmount * 0.008;
  const shadowB = (baseToneB - shadowPivot) * shadowContrast + shadowPivot + shadowLift * 0.58 - shadowWarmth * 1.15;

  const midtoneCenterWeight = 1 - Math.min(1, Math.abs(originalLuma - 0.5) / 0.25);
  const midtonePivot = 0.5;
  const midtoneContrast = 1 + midtoneAmount * (0.32 + midtoneCenterWeight * 0.18);
  const midtoneSaturation = 1 + midtoneAmount * (0.22 + midtoneCenterWeight * 0.18);
  const midtoneContrastR = (baseToneR - midtonePivot) * midtoneContrast + midtonePivot;
  const midtoneContrastG = (baseToneG - midtonePivot) * midtoneContrast + midtonePivot;
  const midtoneContrastB = (baseToneB - midtonePivot) * midtoneContrast + midtonePivot;
  const midtoneGray = 0.299 * midtoneContrastR + 0.587 * midtoneContrastG + 0.114 * midtoneContrastB;
  const midtoneR = midtoneGray + (midtoneContrastR - midtoneGray) * midtoneSaturation + midtoneAmount * 0.028;
  const midtoneG = midtoneGray + (midtoneContrastG - midtoneGray) * midtoneSaturation + midtoneAmount * 0.012;
  const midtoneB = midtoneGray + (midtoneContrastB - midtoneGray) * midtoneSaturation - midtoneAmount * 0.018;

  const highlightDepth = smoothstep(0.58, 1, originalLuma);
  const highlightPivot = 0.78;
  const positiveCompression = Math.max(0, highlightAmount) * (0.18 + highlightDepth * 0.28);
  const negativeExpansion = Math.min(0, highlightAmount) * (0.08 + highlightDepth * 0.08);
  const highlightScale = 1 - positiveCompression - negativeExpansion;
  const highlightLift = Math.min(0, highlightAmount) * 0.08;
  const highlightWarmth = highlightAmount * (0.022 + highlightDepth * 0.016);
  const highlightR = highlightPivot + (baseToneR - highlightPivot) * highlightScale + highlightLift + highlightWarmth;
  const highlightG = highlightPivot + (baseToneG - highlightPivot) * highlightScale + highlightLift * 0.78 + highlightAmount * 0.006;
  const highlightB = highlightPivot + (baseToneB - highlightPivot) * highlightScale + highlightLift * 0.64 - highlightWarmth;

  const shadowZoneWeight = 1 - smoothstep(0.25, 0.41, originalLuma);
  const highlightZoneWeight = smoothstep(0.59, 0.75, originalLuma);
  const midtoneZoneWeight = clamp01(1 - shadowZoneWeight - highlightZoneWeight);
  r = shadowR * shadowZoneWeight + midtoneR * midtoneZoneWeight + highlightR * highlightZoneWeight;
  g = shadowG * shadowZoneWeight + midtoneG * midtoneZoneWeight + highlightG * highlightZoneWeight;
  b = shadowB * shadowZoneWeight + midtoneB * midtoneZoneWeight + highlightB * highlightZoneWeight;

  if (referenceAverageColor !== undefined) {
    r += (clamp01(referenceAverageColor.r) - 0.5) * referenceStrength;
    g += (clamp01(referenceAverageColor.g) - 0.5) * referenceStrength;
    b += (clamp01(referenceAverageColor.b) - 0.5) * referenceStrength;
  }

  if (adjustments.skinToneProtection) {
    const maxChannel = Math.max(originalR, originalG, originalB);
    const minChannel = Math.min(originalR, originalG, originalB);
    const isWarmMidtone =
      originalR > originalB
      && originalR > originalG * 0.9
      && originalG > originalR * 0.35
      && originalG > originalB * 0.72
      && maxChannel - minChannel > 18 / 255;

    if (isWarmMidtone && originalLuma > 0.22 && originalLuma < 0.82) {
      r = originalR * 0.34 + r * 0.66;
      g = originalG * 0.28 + g * 0.72;
      b = originalB * 0.34 + b * 0.66;
      skinProtectionApplied = true;
    }
  }

  if (adjustments.preserveLuma) {
    const adjustedLuma = 0.299 * r + 0.587 * g + 0.114 * b;
    const lumaDelta = originalLuma - adjustedLuma;
    r += lumaDelta * lumaPreserveStrength;
    g += lumaDelta * lumaPreserveStrength;
    b += lumaDelta * lumaPreserveStrength;
  }

  const originalColor = { r: originalR, g: originalG, b: originalB };
  const hasTemperatureTintIntent = Math.abs(adjustments.temperature) > 0 || Math.abs(adjustments.tint) > 0;
  const hueProtectionBase = referenceAverageColor !== undefined ? 0.55 : hasTemperatureTintIntent ? 0.75 : 0.9;
  const originalMaximumChannel = Math.max(originalR, originalG, originalB);
  const originalMinimumChannel = Math.min(originalR, originalG, originalB);
  const relativeSignalSaturation = originalMaximumChannel <= 1e-8
    ? 0
    : (originalMaximumChannel - originalMinimumChannel) / originalMaximumChannel;
  const saturationProtectionWeight = Math.max(
    smoothstep(0.04, 0.14, getOklabChroma(originalColor)),
    smoothstep(0.35, 0.8, relativeSignalSaturation)
  );
  const saturatedHueProtection = hueProtectionBase * saturationProtectionWeight;
  const hueStabilizedLook = stabilizeRgbHue(
    { r, g, b },
    originalColor,
    Math.max(saturatedHueProtection, skinProtectionApplied ? 0.86 : 0)
  );
  const creativeMagnitude = clamp01((
    Math.abs(adjustments.contrast)
    + Math.abs(adjustments.saturation)
    + Math.abs(adjustments.temperature) * 1.5
    + Math.abs(adjustments.tint) * 1.5
    + Math.abs(adjustments.shadowMatch - 50)
    + Math.abs(adjustments.midtoneMatch - 50)
    + Math.abs(adjustments.highlightMatch - 50)
    + (referenceAverageColor === undefined ? 0 : 30)
  ) / 180);
  const shadowChromaRolloff = 1 - smoothstep(0.08, 0.32, originalLuma);
  const highlightChromaRolloff = smoothstep(0.68, 0.95, originalLuma);
  const maximumTonalRolloff = adjustments.preventOversaturation ? 0.2 : 0.1;
  const tonalChromaScale = 1 - maximumTonalRolloff * creativeMagnitude * Math.max(shadowChromaRolloff, highlightChromaRolloff);
  const toneSafeLook = scaleRgbOklabChroma(hueStabilizedLook, tonalChromaScale);
  const compression: GamutCompressionResult = compressRgbToDisplayGamut(
    toneSafeLook,
    {
      protectionStrength: adjustments.preventOversaturation ? 1 : 0.35,
      knee: adjustments.preventOversaturation ? 0.8 : 0.9
    }
  );
  const compressedLook = compression.color;
  const color = {
    r: clamp01(originalR + intensity * (compressedLook.r - originalR)),
    g: clamp01(originalG + intensity * (compressedLook.g - originalG)),
    b: clamp01(originalB + intensity * (compressedLook.b - originalB))
  };

  return {
    color,
    diagnostics: {
      preCompressionColor: toneSafeLook,
      compressedFullLook: compressedLook,
      preCompressionOutOfGamut: compression.wasOutOfGamut,
      postCompressionOutOfGamut: compressedLook.r < 0 || compressedLook.r > 1 || compressedLook.g < 0 || compressedLook.g > 1 || compressedLook.b < 0 || compressedLook.b > 1,
      clippedChannelCount: compression.clippedChannelCount,
      chromaReduction: compression.chromaReduction,
      compressionHueDriftDegrees: compression.hueDriftDegrees
    }
  };
};

export const applyLookToRgb = (
  input: RgbColor,
  adjustments: ColorPreviewAdjustments,
  referenceAverageColor?: RgbColor
): RgbColor => applyLookToRgbWithDiagnostics(input, adjustments, referenceAverageColor).color;

export const generateCubeLut = ({ lutName, lookName, lutSize, adjustments, referenceAverageColor, inputColorConfig, parameterHash, sourceInputProfileId = "bt709-g24-full", inputInterpretationHash }: LutExportOptions): CubeExportResult => {
  const normalizedSize = normalizeLutSize(lutSize);
  const maxIndex = normalizedSize - 1;
  const title = sanitizeLutTitle(lutName);
  const resolvedLookName = lookName?.trim() || "CustomLook";
  const sourceHintBrand = inputColorConfig?.brandLabel ?? inputColorConfig?.brand ?? inputColorConfig?.brandId ?? "Generic";
  const sourceHintGamma = inputColorConfig?.gamma ?? "Rec.709";
  const lines: string[] = [
    `TITLE "${title}"`,
    "# Generated by AI Film LUT Studio",
    "# LUT Export Type: Post-production Creative LUT",
    "# Export Type Code: POST",
    `# Input Contract: ${postLutContract.displayName}`,
    `# Output Contract: ${postLutContract.displayName}`,
    `# Input Profile ID: ${sourceInputProfileId}`,
    `# Output Profile ID: ${postLutContract.outputProfileId}`,
    "# Range: Full",
    "# Transfer Function: BT.1886 Gamma 2.4",
    `# Preview Display Transform: ${browserPreviewDisplayTransform.id}`,
    "# Output Color Space: Rec.709 / Gamma 2.4",
    "# DaVinci Recommended Node Order: CST or RCM -> Exposure and White Balance -> POST Creative LUT -> Optional Fine Tune",
    "# DaVinci Node Key Output Gain: 1.000 reproduces the baked website strength",
    "# Prohibited Input: Unconverted camera Log footage",
    `# Look Name: ${resolvedLookName}`,
    `# Parameter Hash: ${parameterHash ?? "not-calculated"}`,
    `# Input Interpretation Hash: ${inputInterpretationHash ?? "not-calculated"}`,
    "# Cube Hash: calculated-after-generation",
    `# Source Hint Brand: ${sourceHintBrand}`,
    `# Source Hint Gamma: ${sourceHintGamma}`,
    "# Technical Conversion Included: false",
    "# Warning: Apply after technical input conversion when source material is Log.",
    `# Input Brand: ${sourceHintBrand}`,
    `# Input Gamma: ${sourceHintGamma}`,
    `# Input Gamut: ${inputColorConfig?.gamut ?? "Rec.709"}`,
    `# Input Type: ${inputColorConfig?.inputType ?? "rec709"}`,
    `# Input Category: ${inputColorConfig?.category ?? "generic"}`,
    `# Data Status: ${inputColorConfig?.dataStatus ?? "built-in"}`,
    `# Source Status: ${inputColorConfig?.sourceStatus ?? "unknown"}`,
    `# Recommended Workflow: ${inputColorConfig?.recommendedWorkflow ?? "Creative LUT can be tested directly after basic exposure and white balance correction."}`,
    `LUT_3D_SIZE ${normalizedSize}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];

  for (let blueIndex = 0; blueIndex < normalizedSize; blueIndex += 1) {
    const b = blueIndex / maxIndex;

    for (let greenIndex = 0; greenIndex < normalizedSize; greenIndex += 1) {
      const g = greenIndex / maxIndex;

      for (let redIndex = 0; redIndex < normalizedSize; redIndex += 1) {
        const r = redIndex / maxIndex;
        const output = applyLookToRgb({ r, g, b }, adjustments, referenceAverageColor);
        lines.push(`${formatCubeValue(output.r)} ${formatCubeValue(output.g)} ${formatCubeValue(output.b)}`);
      }
    }
  }

  return {
    fileName: generateLutFileName(title),
    content: `${lines.join("\n")}\n`,
    lutSize: normalizedSize,
    dataLineCount: normalizedSize * normalizedSize * normalizedSize,
    exportKind: "post-creative",
    exportTypeCode: "POST",
    lookName: resolvedLookName,
    outputColorSpace: "Rec.709 / Gamma 2.4",
    sourceHintBrand,
    sourceHintGamma,
    inputProfileId: sourceInputProfileId,
    outputProfileId: postLutContract.outputProfileId,
    previewDisplayTransformId: browserPreviewDisplayTransform.id,
    ...(parameterHash === undefined ? {} : { parameterHash }),
    ...(inputInterpretationHash === undefined ? {} : { inputInterpretationHash })
  };
};
