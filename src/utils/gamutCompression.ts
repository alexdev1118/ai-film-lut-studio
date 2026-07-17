import type { RgbColor } from "../types";

export interface GamutCompressionOptions {
  readonly protectionStrength: number;
  readonly knee?: number;
}

export interface GamutCompressionResult {
  readonly color: RgbColor;
  readonly wasOutOfGamut: boolean;
  readonly inputChroma: number;
  readonly outputChroma: number;
  readonly chromaReduction: number;
  readonly hueDriftDegrees: number;
  readonly clippedChannelCount: number;
}

interface OklabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

const EPSILON = 1e-10;
const GAMUT_SEARCH_STEPS = 28;

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const decodeSrgbExtended = (value: number): number => {
  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);
  const linearMagnitude = magnitude <= 0.04045
    ? magnitude / 12.92
    : ((magnitude + 0.055) / 1.055) ** 2.4;
  return sign * linearMagnitude;
};

const encodeSrgbExtended = (value: number): number => {
  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);
  const encodedMagnitude = magnitude <= 0.0031308
    ? magnitude * 12.92
    : 1.055 * magnitude ** (1 / 2.4) - 0.055;
  return sign * encodedMagnitude;
};

const rgbToOklab = (color: RgbColor): OklabColor => {
  const linearR = decodeSrgbExtended(color.r);
  const linearG = decodeSrgbExtended(color.g);
  const linearB = decodeSrgbExtended(color.b);
  const l = Math.cbrt(0.4122214708 * linearR + 0.5363325363 * linearG + 0.0514459929 * linearB);
  const m = Math.cbrt(0.2119034982 * linearR + 0.6806995451 * linearG + 0.1073969566 * linearB);
  const s = Math.cbrt(0.0883024619 * linearR + 0.2817188376 * linearG + 0.6299787005 * linearB);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
};

const oklabToRgb = (color: OklabColor): RgbColor => {
  const lRoot = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: encodeSrgbExtended(linearR),
    g: encodeSrgbExtended(linearG),
    b: encodeSrgbExtended(linearB)
  };
};

const isFiniteRgb = (color: RgbColor): boolean => Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b);

const isInDisplayGamut = (color: RgbColor): boolean =>
  isFiniteRgb(color) && color.r >= 0 && color.r <= 1 && color.g >= 0 && color.g <= 1 && color.b >= 0 && color.b <= 1;

const getChroma = (color: OklabColor): number => Math.hypot(color.a, color.b);

const getHueRadians = (color: OklabColor): number => Math.atan2(color.b, color.a);

const colorAtChroma = (lightness: number, chroma: number, hueRadians: number): OklabColor => ({
  l: lightness,
  a: Math.cos(hueRadians) * chroma,
  b: Math.sin(hueRadians) * chroma
});

const findMaximumDisplayChroma = (lightness: number, hueRadians: number): number => {
  let lower = 0;
  let upper = 1.5;

  for (let index = 0; index < GAMUT_SEARCH_STEPS; index += 1) {
    const candidate = (lower + upper) * 0.5;
    if (isInDisplayGamut(oklabToRgb(colorAtChroma(lightness, candidate, hueRadians)))) {
      lower = candidate;
    } else {
      upper = candidate;
    }
  }

  return lower;
};

const softCompressNormalizedChroma = (normalizedChroma: number, knee: number): number => {
  if (normalizedChroma <= knee) {
    return normalizedChroma;
  }

  const remainingRange = Math.max(EPSILON, 1 - knee);
  const excess = (normalizedChroma - knee) / remainingRange;
  return knee + remainingRange * (1 - Math.exp(-excess));
};

export const hueDistanceDegrees = (left: number, right: number): number => {
  const direct = Math.abs(left - right) % 360;
  return Math.min(direct, 360 - direct);
};

export const getOklabHueDegrees = (color: RgbColor): number => {
  const lab = rgbToOklab(color);
  if (getChroma(lab) <= EPSILON) {
    return 0;
  }
  const degrees = getHueRadians(lab) * 180 / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
};

export const getOklabChroma = (color: RgbColor): number => getChroma(rgbToOklab(color));

export const stabilizeRgbHue = (candidate: RgbColor, source: RgbColor, amount: number): RgbColor => {
  if (!isFiniteRgb(candidate) || !isFiniteRgb(source)) {
    throw new Error("Hue stabilization requires finite RGB channel values.");
  }

  const normalizedAmount = clamp01(amount);
  if (normalizedAmount <= EPSILON) {
    return candidate;
  }

  const candidateLab = rgbToOklab(candidate);
  const sourceLab = rgbToOklab(source);
  const candidateChroma = getChroma(candidateLab);
  const sourceChroma = getChroma(sourceLab);
  if (candidateChroma <= EPSILON || sourceChroma <= EPSILON) {
    return candidate;
  }

  const candidateHue = getHueRadians(candidateLab);
  const sourceHue = getHueRadians(sourceLab);
  const shortestDelta = Math.atan2(Math.sin(sourceHue - candidateHue), Math.cos(sourceHue - candidateHue));
  const stabilizedHue = candidateHue + shortestDelta * normalizedAmount;
  return oklabToRgb(colorAtChroma(candidateLab.l, candidateChroma, stabilizedHue));
};

export const scaleRgbOklabChroma = (color: RgbColor, scale: number): RgbColor => {
  if (!isFiniteRgb(color) || !Number.isFinite(scale)) {
    throw new Error("Chroma scaling requires finite color and scale values.");
  }

  const lab = rgbToOklab(color);
  return oklabToRgb({
    l: lab.l,
    a: lab.a * Math.max(0, scale),
    b: lab.b * Math.max(0, scale)
  });
};

export const compressRgbToDisplayGamut = (
  input: RgbColor,
  options: GamutCompressionOptions
): GamutCompressionResult => {
  if (!isFiniteRgb(input)) {
    throw new Error("Color gamut compression requires finite RGB channel values.");
  }

  const protectionStrength = clamp01(options.protectionStrength);
  const configuredKnee = options.knee ?? 0.82 - protectionStrength * 0.08;
  const knee = clamp(configuredKnee, 0.55, 0.96);
  const wasOutOfGamut = !isInDisplayGamut(input);
  const inputLab = rgbToOklab(input);
  const inputChroma = getChroma(inputLab);
  const inputHue = getOklabHueDegrees(input);
  const chromaticLightnessMargin = Math.min(0.12, inputChroma * 0.3);
  const lightnessSafetyMargin = Math.max(chromaticLightnessMargin, wasOutOfGamut ? 0.005 : 0);
  const boundedLightness = clamp(inputLab.l, lightnessSafetyMargin, 1 - lightnessSafetyMargin);
  const hueRadians = getHueRadians(inputLab);
  const maximumChroma = inputChroma <= EPSILON ? 0 : findMaximumDisplayChroma(boundedLightness, hueRadians);
  const normalizedChroma = maximumChroma <= EPSILON ? 0 : inputChroma / maximumChroma;
  const compressedNormalizedChroma = softCompressNormalizedChroma(normalizedChroma, knee);
  const compressionWasApplied = normalizedChroma > knee || wasOutOfGamut;
  const chromaSafetyScale = compressionWasApplied ? 0.995 : 1;
  const outputChromaTarget = Math.min(maximumChroma, maximumChroma * compressedNormalizedChroma) * chromaSafetyScale;
  const compressedLab = inputChroma <= EPSILON
    ? { l: boundedLightness, a: 0, b: 0 }
    : colorAtChroma(boundedLightness, outputChromaTarget, hueRadians);
  const unboundedOutput = oklabToRgb(compressedLab);
  const clippedChannelCount = [unboundedOutput.r, unboundedOutput.g, unboundedOutput.b]
    .filter((channel) => channel < 0 || channel > 1).length;
  const color = {
    r: clamp01(unboundedOutput.r),
    g: clamp01(unboundedOutput.g),
    b: clamp01(unboundedOutput.b)
  };
  const outputChroma = getOklabChroma(color);
  const outputHue = outputChroma <= EPSILON ? inputHue : getOklabHueDegrees(color);

  return {
    color,
    wasOutOfGamut,
    inputChroma,
    outputChroma,
    chromaReduction: Math.max(0, inputChroma - outputChroma),
    hueDriftDegrees: hueDistanceDegrees(inputHue, outputHue),
    clippedChannelCount
  };
};
