import type {
  CameraLutCubeSize,
  CameraLutRange,
  CameraLutSupportProfile,
  CameraMonitoringExposureConfig,
  InputColorConfig,
  PostLutNamingMode
} from "../types";

export type CameraLutNamingMode = "simple" | "full";

interface PostLutNameOptions {
  readonly lookName: string;
  readonly lutSize: number;
  readonly namingMode: PostLutNamingMode;
  readonly inputColorConfig: InputColorConfig;
  readonly version?: number;
}

const illegalFileNameCharacters = /[\\/:*?"<>|]/g;
const cubeExtensionPattern = /(?:\.cube)+$/i;

const technicalAliases: Readonly<Record<string, string>> = {
  "S-Log3": "SLog3",
  "S-Gamut3.Cine": "SGamut3Cine",
  "S-Gamut3": "SGamut3",
  "S-Log2": "SLog2",
  "S-Gamut": "SGamut",
  "V-Log": "VLog",
  "V-Log L": "VLogL",
  "F-Log2": "FLog2",
  "F-Log": "FLog",
  "D-Log M": "DLogM",
  "D-Log": "DLog",
  "C-Log3": "CLog3",
  "C-Log2": "CLog2",
  "C-Log": "CLog",
  "Rec.709": "Rec709"
};

const lookNameSuggestions: Readonly<Record<string, string>> = {
  "自定义参考图": "CustomLook",
  "青橙电影感": "TealOrange",
  "赛博朋克": "CyberNeon"
};

const replaceTechnicalAliases = (value: string): string => {
  return Object.entries(technicalAliases).reduce((current, [source, replacement]) => current.replaceAll(source, replacement), value);
};

const removeCubeExtension = (value: string): string => value.trim().replace(cubeExtensionPattern, "");

export const sanitizeLutName = (value: string | undefined): string => {
  return removeCubeExtension(typeof value === "string" ? value : "")
    .replace(illegalFileNameCharacters, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/(^[_-]+|[_-]+$)/g, "");
};

export const sanitizeLookName = (value: string | undefined): string => {
  const rawValue = typeof value === "string" ? value : "";
  const suggested = lookNameSuggestions[rawValue.trim()] ?? rawValue;
  const sanitized = sanitizeLutName(suggested);

  return sanitized.length > 0 ? sanitized : "CustomLook";
};

export const suggestLookName = (styleName: string, hasCustomReference = false): string => {
  return hasCustomReference ? "CustomLook" : sanitizeLookName(styleName);
};

const compactNamePart = (value: string): string => {
  return replaceTechnicalAliases(sanitizeLutName(value));
};

export const generateLutFileName = (lutName: string): string => `${sanitizeLutName(lutName) || "AI_Film_LUT"}.cube`;

export const sanitizeLutFileName = generateLutFileName;

export const generatePostLutName = ({ lookName, lutSize, namingMode, inputColorConfig, version = 1 }: PostLutNameOptions): string => {
  const resolvedLookName = sanitizeLookName(lookName);

  if (namingMode === "full") {
    const brand = compactNamePart(inputColorConfig.brandLabel ?? inputColorConfig.brand ?? inputColorConfig.brandId);
    const gamma = compactNamePart(inputColorConfig.gamma ?? "Unknown");

    return sanitizeLutName(
      ["POST", "BT709", "G24", "FULL", `SRC-${brand || "Unknown"}-${gamma || "Unknown"}`, resolvedLookName, `${lutSize}pt`, `v${version}`].join("_")
    );
  }

  return sanitizeLutName(["POST", "BT709", "G24", "FULL", resolvedLookName, `${lutSize}pt`, `v${version}`].join("_"));
};

export const formatEvForName = (value: number): string => {
  if (value === 0) {
    return "EV0";
  }

  return value > 0 ? `EVp${value}` : `EVm${Math.abs(value)}`;
};

export const formatEvForHeader = (value: number): string => {
  if (value === 0) {
    return "0 EV";
  }

  return value > 0 ? `+${value} EV` : `${value} EV`;
};

export const formatShootingTargetEv = (config: CameraMonitoringExposureConfig): string => {
  if (config.mode !== "ettr-normalization" || config.shootingTargetEv === undefined) {
    return "N/A";
  }

  return formatEvForHeader(config.shootingTargetEv);
};

const getMonitoringModeCode = (config: CameraMonitoringExposureConfig): string => {
  if (config.mode === "standard") {
    return "STD";
  }

  if (config.mode === "ettr-normalization") {
    return `ETTRp${config.shootingTargetEv ?? 0}`;
  }

  return `MAN${config.lutBrightnessOffsetEv >= 0 ? "p" : "m"}${Math.abs(config.lutBrightnessOffsetEv)}`;
};

const getRangeCode = (range: CameraLutRange): string => {
  if (range === "full") {
    return "Full";
  }

  if (range === "legal") {
    return "Legal";
  }

  return "RangeUnknown";
};

export const generateCameraLutName = (
  profile: CameraLutSupportProfile,
  gamma: string,
  lookName: string,
  lutSize: CameraLutCubeSize,
  exposureConfig: CameraMonitoringExposureConfig,
  range: CameraLutRange,
  namingMode: CameraLutNamingMode
): string => {
  const verificationPrefix = profile.dataStatus === "verified-official" ? "CAMMON" : "CAMMON_TEST";
  const baseParts = [
    verificationPrefix,
    compactNamePart(profile.brandLabel),
    compactNamePart(profile.modelName),
    compactNamePart(gamma),
    sanitizeLookName(lookName)
  ];

  if (namingMode === "full") {
    baseParts.push(getMonitoringModeCode(exposureConfig), getRangeCode(range));
  }

  baseParts.push(`${lutSize}pt`, "v1");
  return sanitizeLutName(baseParts.filter((part) => part.length > 0).join("_"));
};
