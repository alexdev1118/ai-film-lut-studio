import type { LutParameters, LutStyle } from "../types";
import type { LutStyleStrength } from "../types/lutStyles";

const supportedStyleStrengths: readonly LutStyleStrength[] = [35, 50, 70, 100];

export interface LutStyleWorkspaceApplication {
  readonly styleId: string;
  readonly styleName: string;
  readonly parameters: Pick<
    LutParameters,
    | "intensity"
    | "contrast"
    | "saturation"
    | "temperature"
    | "tint"
    | "shadowMatch"
    | "midtoneMatch"
    | "highlightMatch"
  >;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
}

export const applyLutStyleToWorkspace = (
  style: LutStyle,
  strength: LutStyleStrength = style.recommendedIntensity
): LutStyleWorkspaceApplication => ({
  styleId: style.id,
  styleName: style.name,
  parameters: {
    intensity: strength,
    contrast: style.adjustments.contrast,
    saturation: style.adjustments.saturation,
    temperature: style.adjustments.temperature,
    tint: style.adjustments.tint,
    shadowMatch: style.adjustments.shadowMatch,
    midtoneMatch: style.adjustments.midtoneMatch,
    highlightMatch: style.adjustments.highlightMatch
  },
  skinToneProtection: style.adjustments.skinToneProtection,
  preserveLuma: style.adjustments.preserveLuma,
  preventOversaturation: style.adjustments.preventOversaturation
});

export const parseLutStyleStrength = (value: string | null): LutStyleStrength | undefined => {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return supportedStyleStrengths.find((strength) => strength === parsed);
};

export const createStyleWorkspaceQuery = (styleId: string, strength: LutStyleStrength): string => {
  const normalizedStyleId = styleId.trim();
  if (normalizedStyleId.length === 0) {
    throw new Error("A style id is required to create a workspace selection query.");
  }

  const params = new URLSearchParams();
  params.set("style", normalizedStyleId);
  params.set("strength", String(strength));
  return params.toString();
};
