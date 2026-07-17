import { getColorEncodingProfile, postLutContract } from "../data/colorEncodingProfiles";
import type {
  ColorConversionResult,
  ColorEncodingProfile,
  ColorEncodingProfileId,
  ImageColorInterpretation,
  RgbColor,
  SignalRange,
  TransferFunction
} from "../types";

type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number]
];

const DISPLAY_P3_TO_XYZ: Matrix3 = [
  [0.4865709486, 0.2656676932, 0.1982172852],
  [0.2289745641, 0.6917385218, 0.0792869141],
  [0, 0.0451133819, 1.0439443689]
];

const DCI_P3_TO_XYZ: Matrix3 = [
  [0.4451698156, 0.2771344092, 0.1722826698],
  [0.2094916779, 0.7215952542, 0.068913067],
  [0, 0.0470605601, 0.9073553944]
];

const XYZ_TO_BT709: Matrix3 = [
  [3.2409699419, -1.5373831776, -0.4986107603],
  [-0.9692436363, 1.8759675015, 0.0415550574],
  [0.0556300797, -0.2039769589, 1.0569715142]
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const multiplyMatrix = (matrix: Matrix3, color: RgbColor): RgbColor => ({
  r: matrix[0][0] * color.r + matrix[0][1] * color.g + matrix[0][2] * color.b,
  g: matrix[1][0] * color.r + matrix[1][1] * color.g + matrix[1][2] * color.b,
  b: matrix[2][0] * color.r + matrix[2][1] * color.g + matrix[2][2] * color.b
});

export const decodeSrgbChannel = (value: number): number => {
  const encoded = clamp01(value);
  return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
};

export const encodeSrgbChannel = (value: number): number => {
  const linear = clamp01(value);
  return linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
};

export const decodeBt1886Gamma24Channel = (value: number, blackLevel = 0, whiteLevel = 1): number => {
  const encoded = clamp01(value);
  const gamma = 2.4;
  const safeBlack = clamp01(blackLevel);
  const safeWhite = Math.max(safeBlack + Number.EPSILON, clamp01(whiteLevel));
  const blackRoot = safeBlack ** (1 / gamma);
  const whiteRoot = safeWhite ** (1 / gamma);
  const denominator = whiteRoot - blackRoot;
  const a = denominator ** gamma;
  const b = blackRoot / denominator;
  return clamp01(a * Math.max(encoded + b, 0) ** gamma);
};

export const encodeBt1886Gamma24Channel = (value: number, blackLevel = 0, whiteLevel = 1): number => {
  const linear = clamp01(value);
  const gamma = 2.4;
  const safeBlack = clamp01(blackLevel);
  const safeWhite = Math.max(safeBlack + Number.EPSILON, clamp01(whiteLevel));
  const blackRoot = safeBlack ** (1 / gamma);
  const whiteRoot = safeWhite ** (1 / gamma);
  const denominator = whiteRoot - blackRoot;
  const a = denominator ** gamma;
  const b = blackRoot / denominator;
  return clamp01((linear / a) ** (1 / gamma) - b);
};

export const decodeRec709Gamma24Channel = decodeBt1886Gamma24Channel;

export const encodeRec709Gamma24Channel = encodeBt1886Gamma24Channel;

export const decodeGamma22Channel = (value: number): number => clamp01(value) ** 2.2;

export const encodeGamma22Channel = (value: number): number => clamp01(value) ** (1 / 2.2);

export const decodeGamma26Channel = (value: number): number => clamp01(value) ** 2.6;

export const encodeGamma26Channel = (value: number): number => clamp01(value) ** (1 / 2.6);

export const expandSignalRange = (color: RgbColor, range: SignalRange): RgbColor => {
  if (range !== "legal") {
    return { r: clamp01(color.r), g: clamp01(color.g), b: clamp01(color.b) };
  }

  const minimum = 16 / 255;
  const scale = 219 / 255;
  return {
    r: clamp01((color.r - minimum) / scale),
    g: clamp01((color.g - minimum) / scale),
    b: clamp01((color.b - minimum) / scale)
  };
};

export const compressSignalRange = (color: RgbColor, range: SignalRange): RgbColor => {
  if (range !== "legal") {
    return { r: clamp01(color.r), g: clamp01(color.g), b: clamp01(color.b) };
  }

  const minimum = 16 / 255;
  const scale = 219 / 255;
  return {
    r: minimum + clamp01(color.r) * scale,
    g: minimum + clamp01(color.g) * scale,
    b: minimum + clamp01(color.b) * scale
  };
};

const decodeTransfer = (color: RgbColor, transferFunction: TransferFunction): RgbColor => {
  const decode = transferFunction === "srgb"
    ? decodeSrgbChannel
    : transferFunction === "bt1886-gamma24"
      ? decodeBt1886Gamma24Channel
      : transferFunction === "gamma22"
        ? decodeGamma22Channel
        : transferFunction === "gamma26"
          ? decodeGamma26Channel
          : (value: number): number => clamp01(value);

  return { r: decode(color.r), g: decode(color.g), b: decode(color.b) };
};

const encodeTransfer = (color: RgbColor, transferFunction: TransferFunction): RgbColor => {
  const encode = transferFunction === "srgb"
    ? encodeSrgbChannel
    : transferFunction === "bt1886-gamma24"
      ? encodeBt1886Gamma24Channel
      : transferFunction === "gamma22"
        ? encodeGamma22Channel
        : transferFunction === "gamma26"
          ? encodeGamma26Channel
          : (value: number): number => clamp01(value);

  return { r: encode(color.r), g: encode(color.g), b: encode(color.b) };
};

const convertPrimariesToLinearBt709 = (color: RgbColor, profile: ColorEncodingProfile): RgbColor => {
  if (profile.primaries === "display-p3") {
    return multiplyMatrix(XYZ_TO_BT709, multiplyMatrix(DISPLAY_P3_TO_XYZ, color));
  }

  if (profile.primaries === "dci-p3") {
    return multiplyMatrix(XYZ_TO_BT709, multiplyMatrix(DCI_P3_TO_XYZ, color));
  }

  return color;
};

export const convertSourceToPostInput = (input: RgbColor, profileId: ColorEncodingProfileId): ColorConversionResult => {
  const profile = getColorEncodingProfile(profileId);
  const expanded = expandSignalRange(input, profile.range);
  const decoded = decodeTransfer(expanded, profile.transferFunction);
  const linearBt709 = convertPrimariesToLinearBt709(decoded, profile);
  const encodedPostInput = encodeTransfer(linearBt709, "bt1886-gamma24");
  const reliable = profile.status === "supported" && profile.transferFunction !== "unknown" && profile.transferFunction !== "camera-log";

  return {
    color: encodedPostInput,
    sourceProfileId: profile.id,
    destinationProfileId: postLutContract.inputProfileId,
    reliable,
    ...(reliable ? {} : { warning: profile.warning })
  };
};

export const inputColorToRec709Gamma24 = (color: RgbColor, interpretation: ImageColorInterpretation): RgbColor => {
  return convertSourceToPostInput(color, interpretation.profileId).color;
};

export const rec709Gamma24ToDisplaySrgb = (color: RgbColor): RgbColor => {
  const linearBt709 = decodeTransfer(color, "bt1886-gamma24");
  return encodeTransfer(linearBt709, "srgb");
};

export const convertProfileColorToDisplaySrgb = (color: RgbColor, profileId: ColorEncodingProfileId): ColorConversionResult => {
  const postInput = convertSourceToPostInput(color, profileId);
  return {
    ...postInput,
    color: rec709Gamma24ToDisplaySrgb(postInput.color),
    destinationProfileId: "srgb-full"
  };
};

export const createConfirmedInterpretation = (profileId: ColorEncodingProfileId, note: string): ImageColorInterpretation => ({
  profileId,
  confidence: "confirmed",
  source: "user-confirmed",
  note
});

export const defaultSrgbInterpretation = (): ImageColorInterpretation => ({
  profileId: "srgb-full",
  confidence: "confirmed",
  source: "standards-defined",
  note: "普通 JPG / PNG / WebP / TIFF 默认按 sRGB / Full 解释；Display P3 或其他 ICC 需要人工确认。"
});

export const defaultDpxInterpretation = (
  headerEvidence = "Header Transfer / Colorimetric 原始值仅作为线索；当前没有足够可靠的映射可自动确定 Profile。"
): ImageColorInterpretation => ({
  profileId: "unknown-manual",
  confidence: "unknown",
  source: "header-suggestion",
  note: "DPX Header 未提供足够可靠的 Transfer / Range 映射，当前不会静默按 Rec.709 处理。",
  headerEvidence
});
