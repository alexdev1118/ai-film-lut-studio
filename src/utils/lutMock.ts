import type { LutParameters } from "../types";

export const defaultLutParameters: LutParameters = {
  intensity: 68,
  contrast: 54,
  saturation: 58,
  temperature: 0,
  shadowMatch: 62,
  midtoneMatch: 70,
  highlightMatch: 56,
  tint: 0,
  inputColorSpace: "Rec.709",
  precision: "33x33x33"
};

export const colorSpaceOptions = ["Rec.709", "S-Log3", "D-Log M", "C-Log3", "V-Log", "F-Log", "不确定"] as const;

export const precisionOptions = ["17x17x17", "33x33x33", "65x65x65"] as const;
