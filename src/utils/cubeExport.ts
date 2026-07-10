import type { ColorPreviewAdjustments, CubeExportResult, LutExportOptions, RgbColor } from "../types";
import { generateLutFileName, sanitizeLutName } from "./lutNaming";

const clamp01 = (value: number): number => {
  return Math.min(Math.max(value, 0), 1);
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

export const applyLookToRgb = (input: RgbColor, adjustments: ColorPreviewAdjustments, referenceAverageColor?: RgbColor): RgbColor => {
  const originalR = clamp01(input.r);
  const originalG = clamp01(input.g);
  const originalB = clamp01(input.b);
  const originalLuma = 0.299 * originalR + 0.587 * originalG + 0.114 * originalB;
  const intensity = clamp01(adjustments.intensity / 100);
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
  const referenceStrength = referenceAverageColor === undefined ? 0 : Math.min(0.24, 0.08 + intensity * 0.16);
  const saturationCeiling = adjustments.preventOversaturation ? 246 / 255 : 1;
  const lumaPreserveStrength = adjustments.preserveLuma ? 0.52 : 0.18;
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

  if (originalLuma < 0.33) {
    const shadowDepth = Math.min(1, Math.max(0, (0.33 - originalLuma) / 0.33));
    const shadowPivot = 0.18;
    const shadowContrast = 1 + shadowAmount * (0.38 + shadowDepth * 0.22);
    const shadowLift = shadowAmount * (0.07 + shadowDepth * 0.06);
    const shadowWarmth = shadowAmount * (0.025 + shadowDepth * 0.018);

    r = (r - shadowPivot) * shadowContrast + shadowPivot + shadowLift + shadowWarmth;
    g = (g - shadowPivot) * shadowContrast + shadowPivot + shadowLift * 0.78 + shadowAmount * 0.008;
    b = (b - shadowPivot) * shadowContrast + shadowPivot + shadowLift * 0.58 - shadowWarmth * 1.15;
  } else if (originalLuma < 0.66) {
    const midtoneCenterWeight = 1 - Math.min(1, Math.abs(originalLuma - 0.5) / 0.17);
    const midtonePivot = 0.5;
    const midtoneContrast = 1 + midtoneAmount * (0.32 + midtoneCenterWeight * 0.18);
    const midtoneSaturation = 1 + midtoneAmount * (0.22 + midtoneCenterWeight * 0.18);

    r = (r - midtonePivot) * midtoneContrast + midtonePivot;
    g = (g - midtonePivot) * midtoneContrast + midtonePivot;
    b = (b - midtonePivot) * midtoneContrast + midtonePivot;

    const midtoneGray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = midtoneGray + (r - midtoneGray) * midtoneSaturation + midtoneAmount * 0.028;
    g = midtoneGray + (g - midtoneGray) * midtoneSaturation + midtoneAmount * 0.012;
    b = midtoneGray + (b - midtoneGray) * midtoneSaturation - midtoneAmount * 0.018;
  } else {
    const highlightWeight = Math.min(1, Math.max(0, (originalLuma - 0.66) / 0.34));
    const highlightPivot = 0.78;
    const positiveCompression = Math.max(0, highlightAmount) * (0.18 + highlightWeight * 0.28);
    const negativeExpansion = Math.min(0, highlightAmount) * (0.08 + highlightWeight * 0.08);
    const highlightScale = 1 - positiveCompression - negativeExpansion;
    const highlightLift = Math.min(0, highlightAmount) * 0.08;
    const highlightWarmth = highlightAmount * (0.022 + highlightWeight * 0.016);

    r = highlightPivot + (r - highlightPivot) * highlightScale + highlightLift + highlightWarmth;
    g = highlightPivot + (g - highlightPivot) * highlightScale + highlightLift * 0.78 + highlightAmount * 0.006;
    b = highlightPivot + (b - highlightPivot) * highlightScale + highlightLift * 0.64 - highlightWarmth;
  }

  if (referenceAverageColor !== undefined) {
    r += (clamp01(referenceAverageColor.r) - 0.5) * referenceStrength;
    g += (clamp01(referenceAverageColor.g) - 0.5) * referenceStrength;
    b += (clamp01(referenceAverageColor.b) - 0.5) * referenceStrength;
  }

  if (adjustments.skinToneProtection) {
    const maxChannel = Math.max(originalR, originalG, originalB);
    const minChannel = Math.min(originalR, originalG, originalB);
    const isWarmMidtone =
      originalR > originalB && originalR > originalG * 0.9 && originalG > originalB * 0.72 && maxChannel - minChannel > 18 / 255;

    if (isWarmMidtone && originalLuma > 0.22 && originalLuma < 0.82) {
      r = originalR * 0.34 + r * 0.66;
      g = originalG * 0.28 + g * 0.72;
      b = originalB * 0.34 + b * 0.66;
    }
  }

  if (adjustments.preserveLuma) {
    const adjustedLuma = 0.299 * r + 0.587 * g + 0.114 * b;
    const lumaDelta = originalLuma - adjustedLuma;
    r += lumaDelta * lumaPreserveStrength;
    g += lumaDelta * lumaPreserveStrength;
    b += lumaDelta * lumaPreserveStrength;
  }

  return {
    r: clamp01(Math.min(originalR * (1 - intensity) + r * intensity, saturationCeiling)),
    g: clamp01(Math.min(originalG * (1 - intensity) + g * intensity, saturationCeiling)),
    b: clamp01(Math.min(originalB * (1 - intensity) + b * intensity, saturationCeiling))
  };
};

export const generateCubeLut = ({ lutName, lookName, lutSize, adjustments, referenceAverageColor, inputColorConfig }: LutExportOptions): CubeExportResult => {
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
    "# Output Color Space: Rec.709",
    `# Look Name: ${resolvedLookName}`,
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
    outputColorSpace: "Rec.709",
    sourceHintBrand,
    sourceHintGamma
  };
};

export const downloadCubeLut = (result: CubeExportResult): void => {
  const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = result.fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
};
