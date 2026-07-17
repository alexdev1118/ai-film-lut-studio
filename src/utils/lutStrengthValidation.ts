import type { LutStrengthValidationFixture } from "../data/lutStrengthFixtures";
import type { ColorPreviewAdjustments, RgbColor } from "../types";
import type { LutValidationSceneId } from "../types/lutValidation";
import { applyLookToRgb } from "./cubeExport";
import { analyzeLutStrengthDiagnostics, type LutStrengthDiagnostics } from "./lutStrengthDiagnostics";

export type LutStrengthLevel = 35 | 50 | 70 | 100;

export interface LutStrengthSceneResult {
  readonly strength: LutStrengthLevel;
  readonly averageRgbDistance: number;
  readonly maximumRgbDistance: number;
  readonly diagnostics: LutStrengthDiagnostics;
}

export interface LutStrengthSceneMatrix {
  readonly sceneId: LutValidationSceneId;
  readonly label: string;
  readonly source: "procedural-stress-fixture";
  readonly monotonic: boolean;
  readonly results: readonly LutStrengthSceneResult[];
}

export interface LutStrengthValidationMatrix {
  readonly schemaVersion: 1;
  readonly sampleSource: "procedural-stress-fixtures-not-user-media";
  readonly strengths: readonly LutStrengthLevel[];
  readonly scenes: readonly LutStrengthSceneMatrix[];
  readonly allScenesMonotonic: boolean;
}

const STRENGTH_LEVELS: readonly LutStrengthLevel[] = [35, 50, 70, 100];

const rgbDistance = (left: RgbColor, right: RgbColor): number => Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);

const isStrictlyIncreasing = (values: readonly number[]): boolean => {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined || current <= previous + 1e-9) {
      return false;
    }
  }
  return true;
};

export const createLutStrengthValidationMatrix = (
  fixtures: readonly LutStrengthValidationFixture[],
  baseAdjustments: ColorPreviewAdjustments,
  referenceAverageColor?: RgbColor
): LutStrengthValidationMatrix => {
  if (fixtures.length === 0) {
    throw new Error("LUT strength validation requires at least one scene fixture.");
  }

  const scenes = fixtures.map((fixture): LutStrengthSceneMatrix => {
    if (fixture.samples.length === 0) {
      throw new Error(`Scene ${fixture.sceneId} has no validation samples.`);
    }

    const results = STRENGTH_LEVELS.map((strength): LutStrengthSceneResult => {
      const adjustments = { ...baseAdjustments, intensity: strength };
      const distances = fixture.samples.map((sample) => rgbDistance(sample, applyLookToRgb(sample, adjustments, referenceAverageColor)));
      return {
        strength,
        averageRgbDistance: distances.reduce((total, value) => total + value, 0) / distances.length,
        maximumRgbDistance: Math.max(...distances),
        diagnostics: analyzeLutStrengthDiagnostics(fixture.samples, adjustments, referenceAverageColor)
      };
    });
    const monotonic = isStrictlyIncreasing(results.map((result) => result.averageRgbDistance));
    return {
      sceneId: fixture.sceneId,
      label: fixture.label,
      source: fixture.source,
      monotonic,
      results
    };
  });

  return {
    schemaVersion: 1,
    sampleSource: "procedural-stress-fixtures-not-user-media",
    strengths: STRENGTH_LEVELS,
    scenes,
    allScenesMonotonic: scenes.every((scene) => scene.monotonic)
  };
};
