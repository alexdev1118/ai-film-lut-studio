import type { CameraLutCubeSize, CameraLutSupportProfile, CameraMonitoringExposureConfig } from "../types";

export type CameraLutNamingMode = "simple" | "full";

const illegalFileNameCharacters = /[\\/:*?"<>|]/g;

const compactNamePart = (value: string): string => {
  return value
    .trim()
    .replace(illegalFileNameCharacters, "-")
    .replace(/\s+/g, "")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/g, "");
};

export const sanitizeLutName = (value: string): string => {
  return value
    .replace(illegalFileNameCharacters, "-")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/g, "");
};

export const sanitizeLutFileName = (value: string): string => {
  const sanitized = sanitizeLutName(value);

  return `${sanitized.length > 0 ? sanitized : "AI_Film_LUT"}.cube`;
};

export const formatEvForName = (value: number): string => {
  if (value === 0) {
    return "EV0";
  }

  return value > 0 ? `EV+${value}` : `EV${value}`;
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

export const generatePostLutName = (styleName: string): string => {
  const baseName = sanitizeLutName(styleName);

  return baseName.length > 0 ? `${baseName}_Studio_V1` : "AI_Film_LUT_Studio_V1";
};

export const generateCameraLutName = (
  profile: CameraLutSupportProfile,
  gamma: string,
  lutSize: CameraLutCubeSize,
  exposureConfig: CameraMonitoringExposureConfig,
  namingMode: CameraLutNamingMode
): string => {
  const brandPart = compactNamePart(profile.brandLabel);
  const gammaPart = compactNamePart(gamma);
  const sizePart = `${lutSize}`;

  if (namingMode === "simple") {
    return sanitizeLutName([brandPart, gammaPart, sizePart].filter((part) => part.length > 0).join("_"));
  }

  const modelPart = compactNamePart(profile.modelName);
  const evPart = formatEvForName(exposureConfig.lutBrightnessOffsetEv);

  return sanitizeLutName([brandPart, modelPart, gammaPart, evPart, `${sizePart}pt`].filter((part) => part.length > 0).join("_"));
};
