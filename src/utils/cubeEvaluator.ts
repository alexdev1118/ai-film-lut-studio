import type { ParsedCubeLut, RgbColor } from "../types";
import { trilinearInterpolate } from "./lutInterpolation";

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

const normalizeChannel = (value: number, minimum: number, maximum: number): number => clamp01((value - minimum) / (maximum - minimum));

const getDataIndex = (size: number, redIndex: number, greenIndex: number, blueIndex: number): number => {
  return blueIndex * size * size + greenIndex * size + redIndex;
};

export const evaluateCubeLut = (lut: ParsedCubeLut, input: RgbColor): RgbColor => {
  const maxIndex = lut.size - 1;
  const scaledRed = normalizeChannel(input.r, lut.domainMin.r, lut.domainMax.r) * maxIndex;
  const scaledGreen = normalizeChannel(input.g, lut.domainMin.g, lut.domainMax.g) * maxIndex;
  const scaledBlue = normalizeChannel(input.b, lut.domainMin.b, lut.domainMax.b) * maxIndex;
  const red0 = Math.floor(scaledRed);
  const green0 = Math.floor(scaledGreen);
  const blue0 = Math.floor(scaledBlue);
  const red1 = Math.min(red0 + 1, maxIndex);
  const green1 = Math.min(green0 + 1, maxIndex);
  const blue1 = Math.min(blue0 + 1, maxIndex);
  const getColor = (red: number, green: number, blue: number): RgbColor => {
    const color = lut.data[getDataIndex(lut.size, red, green, blue)];
    if (color === undefined) {
      throw new Error(`3D LUT 数据索引越界：r=${red}, g=${green}, b=${blue}`);
    }
    return color;
  };

  return trilinearInterpolate(
    {
      c000: getColor(red0, green0, blue0),
      c100: getColor(red1, green0, blue0),
      c010: getColor(red0, green1, blue0),
      c110: getColor(red1, green1, blue0),
      c001: getColor(red0, green0, blue1),
      c101: getColor(red1, green0, blue1),
      c011: getColor(red0, green1, blue1),
      c111: getColor(red1, green1, blue1)
    },
    scaledRed - red0,
    scaledGreen - green0,
    scaledBlue - blue0
  );
};
