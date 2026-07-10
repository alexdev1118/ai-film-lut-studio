import type { RgbColor } from "../types";

export interface TrilinearCorners {
  readonly c000: RgbColor;
  readonly c100: RgbColor;
  readonly c010: RgbColor;
  readonly c110: RgbColor;
  readonly c001: RgbColor;
  readonly c101: RgbColor;
  readonly c011: RgbColor;
  readonly c111: RgbColor;
}

const lerp = (start: number, end: number, amount: number): number => start + (end - start) * amount;

const lerpColor = (start: RgbColor, end: RgbColor, amount: number): RgbColor => ({
  r: lerp(start.r, end.r, amount),
  g: lerp(start.g, end.g, amount),
  b: lerp(start.b, end.b, amount)
});

export const trilinearInterpolate = (
  corners: TrilinearCorners,
  redFraction: number,
  greenFraction: number,
  blueFraction: number
): RgbColor => {
  const red00 = lerpColor(corners.c000, corners.c100, redFraction);
  const red10 = lerpColor(corners.c010, corners.c110, redFraction);
  const red01 = lerpColor(corners.c001, corners.c101, redFraction);
  const red11 = lerpColor(corners.c011, corners.c111, redFraction);
  const green0 = lerpColor(red00, red10, greenFraction);
  const green1 = lerpColor(red01, red11, greenFraction);

  return lerpColor(green0, green1, blueFraction);
};
