import type { RgbColor } from "../types";
import type { LutValidationSceneId } from "../types/lutValidation";

export interface LutStrengthValidationFixture {
  readonly sceneId: LutValidationSceneId;
  readonly label: string;
  readonly source: "procedural-stress-fixture";
  readonly samples: readonly RgbColor[];
}

export const lutStrengthValidationFixtures: readonly LutStrengthValidationFixture[] = [
  {
    sceneId: "portrait-normal",
    label: "正常曝光人物",
    source: "procedural-stress-fixture",
    samples: [
      { r: 0.12, g: 0.1, b: 0.09 },
      { r: 0.31, g: 0.22, b: 0.18 },
      { r: 0.52, g: 0.35, b: 0.27 },
      { r: 0.68, g: 0.47, b: 0.37 },
      { r: 0.78, g: 0.58, b: 0.48 },
      { r: 0.44, g: 0.43, b: 0.41 },
      { r: 0.72, g: 0.71, b: 0.69 },
      { r: 0.91, g: 0.9, b: 0.88 }
    ]
  },
  {
    sceneId: "portrait-close",
    label: "人物近景",
    source: "procedural-stress-fixture",
    samples: [
      { r: 0.2, g: 0.13, b: 0.11 },
      { r: 0.43, g: 0.27, b: 0.2 },
      { r: 0.62, g: 0.39, b: 0.29 },
      { r: 0.79, g: 0.53, b: 0.41 },
      { r: 0.72, g: 0.3, b: 0.31 },
      { r: 0.86, g: 0.62, b: 0.5 },
      { r: 0.49, g: 0.45, b: 0.42 },
      { r: 0.95, g: 0.88, b: 0.82 }
    ]
  },
  {
    sceneId: "blue-sky",
    label: "蓝天",
    source: "procedural-stress-fixture",
    samples: [
      { r: 0.04, g: 0.12, b: 0.31 },
      { r: 0.08, g: 0.25, b: 0.58 },
      { r: 0.12, g: 0.42, b: 0.78 },
      { r: 0.22, g: 0.58, b: 0.91 },
      { r: 0.38, g: 0.69, b: 0.96 },
      { r: 0.66, g: 0.82, b: 0.98 },
      { r: 0.86, g: 0.92, b: 0.99 },
      { r: 0.98, g: 0.98, b: 0.97 }
    ]
  },
  {
    sceneId: "blue-sky-greenery",
    label: "蓝天绿植",
    source: "procedural-stress-fixture",
    samples: [
      { r: 0.03, g: 0.16, b: 0.38 },
      { r: 0.09, g: 0.39, b: 0.72 },
      { r: 0.08, g: 0.24, b: 0.07 },
      { r: 0.12, g: 0.48, b: 0.11 },
      { r: 0.19, g: 0.67, b: 0.16 },
      { r: 0.42, g: 0.78, b: 0.28 },
      { r: 0.71, g: 0.82, b: 0.62 },
      { r: 0.93, g: 0.94, b: 0.9 }
    ]
  },
  {
    sceneId: "daylight-high-contrast",
    label: "高反差白天",
    source: "procedural-stress-fixture",
    samples: [
      { r: 0.005, g: 0.006, b: 0.008 },
      { r: 0.02, g: 0.025, b: 0.03 },
      { r: 0.08, g: 0.07, b: 0.06 },
      { r: 0.24, g: 0.22, b: 0.2 },
      { r: 0.5, g: 0.48, b: 0.45 },
      { r: 0.82, g: 0.79, b: 0.73 },
      { r: 0.97, g: 0.96, b: 0.94 },
      { r: 0.995, g: 0.993, b: 0.99 }
    ]
  },
  {
    sceneId: "saturated-red",
    label: "高饱和红色物体",
    source: "procedural-stress-fixture",
    samples: [
      { r: 0.21, g: 0.025, b: 0.018 },
      { r: 0.4, g: 0.04, b: 0.025 },
      { r: 0.62, g: 0.055, b: 0.03 },
      { r: 0.78, g: 0.07, b: 0.035 },
      { r: 0.9, g: 0.08, b: 0.04 },
      { r: 0.97, g: 0.1, b: 0.055 },
      { r: 0.75, g: 0.18, b: 0.12 },
      { r: 0.98, g: 0.72, b: 0.63 }
    ]
  }
];
