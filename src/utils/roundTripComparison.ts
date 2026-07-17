import type { RoundTripComparisonResult, RoundTripDiagnosis } from "../types";
import { decodeSrgbChannel } from "./colorSpace";

export interface RoundTripPixelComparisonInput {
  readonly expected: Uint8ClampedArray;
  readonly actual: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

const percentile = (values: readonly number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
};

const average = (values: readonly number[]): number => {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
};

const getDiagnosis = (
  passed: boolean,
  rgbMeanAbsoluteError: number,
  linearLightMeanAbsoluteError: number,
  darkRegionError: number,
  midtoneRegionError: number,
  highlightRegionError: number,
  luminanceError: number,
  saturationError: number
): RoundTripDiagnosis => {
  if (passed) {
    return "lut-values-consistent";
  }

  const endpointError = (darkRegionError + highlightRegionError) / 2;
  if (endpointError > 0.025 && endpointError > midtoneRegionError * 1.3) {
    return "range-mismatch-suspected";
  }
  if (midtoneRegionError > 0.015 && midtoneRegionError > endpointError * 1.25) {
    return "gamma-mismatch-suspected";
  }
  if (linearLightMeanAbsoluteError < rgbMeanAbsoluteError * 0.55 && luminanceError > saturationError * 1.5) {
    return "viewer-only-difference-suspected";
  }
  if (saturationError > luminanceError * 1.4) {
    return "input-profile-mismatch";
  }
  return "unknown-display-pipeline-difference";
};

export const compareRoundTripPixels = ({ expected, actual, width, height }: RoundTripPixelComparisonInput): RoundTripComparisonResult => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Round-trip 比较尺寸必须是正整数。");
  }

  const expectedLength = width * height * 4;
  if (expected.length !== expectedLength || actual.length !== expectedLength) {
    throw new Error(`Round-trip 像素长度不匹配：期望 ${expectedLength}，收到 ${expected.length} / ${actual.length}。`);
  }

  const channelErrors: number[] = [];
  const linearErrors: number[] = [];
  const neutralErrors: number[] = [];
  const luminanceErrors: number[] = [];
  const saturationErrors: number[] = [];
  const darkErrors: number[] = [];
  const midtoneErrors: number[] = [];
  const highlightErrors: number[] = [];
  let maximumError = 0;
  let pixelCount = 0;

  for (let index = 0; index < expectedLength; index += 4) {
    if (expected[index + 3] === 0 || actual[index + 3] === 0) {
      continue;
    }

    const expectedR = expected[index] / 255;
    const expectedG = expected[index + 1] / 255;
    const expectedB = expected[index + 2] / 255;
    const actualR = actual[index] / 255;
    const actualG = actual[index + 1] / 255;
    const actualB = actual[index + 2] / 255;
    const errors = [Math.abs(expectedR - actualR), Math.abs(expectedG - actualG), Math.abs(expectedB - actualB)];
    const pixelError = average(errors);
    const expectedLuma = 0.2126 * expectedR + 0.7152 * expectedG + 0.0722 * expectedB;
    const actualLuma = 0.2126 * actualR + 0.7152 * actualG + 0.0722 * actualB;
    const expectedSaturation = Math.max(expectedR, expectedG, expectedB) - Math.min(expectedR, expectedG, expectedB);
    const actualSaturation = Math.max(actualR, actualG, actualB) - Math.min(actualR, actualG, actualB);

    errors.forEach((error) => {
      channelErrors.push(error);
      maximumError = Math.max(maximumError, error);
    });
    linearErrors.push(
      Math.abs(decodeSrgbChannel(expectedR) - decodeSrgbChannel(actualR)),
      Math.abs(decodeSrgbChannel(expectedG) - decodeSrgbChannel(actualG)),
      Math.abs(decodeSrgbChannel(expectedB) - decodeSrgbChannel(actualB))
    );
    luminanceErrors.push(Math.abs(expectedLuma - actualLuma));
    saturationErrors.push(Math.abs(expectedSaturation - actualSaturation));

    if (expectedSaturation <= 0.035) {
      neutralErrors.push(pixelError);
    }
    if (expectedLuma < 0.25) {
      darkErrors.push(pixelError);
    } else if (expectedLuma < 0.75) {
      midtoneErrors.push(pixelError);
    } else {
      highlightErrors.push(pixelError);
    }
    pixelCount += 1;
  }

  if (pixelCount === 0) {
    throw new Error("Round-trip 比较没有可用的不透明像素。");
  }

  const rgbMeanAbsoluteError = average(channelErrors);
  const linearLightMeanAbsoluteError = average(linearErrors);
  const p95Error = percentile(channelErrors, 0.95);
  const p99Error = percentile(channelErrors, 0.99);
  const p999Error = percentile(channelErrors, 0.999);
  const channelSampleCount = channelErrors.length;
  const channelErrorAbove025Count = channelErrors.filter((error) => error > 0.025).length;
  const channelErrorAbove04Count = channelErrors.filter((error) => error > 0.04).length;
  const channelErrorAbove08Count = channelErrors.filter((error) => error > 0.08).length;
  const neutralGrayError = average(neutralErrors);
  const luminanceError = average(luminanceErrors);
  const saturationError = average(saturationErrors);
  const darkRegionError = average(darkErrors);
  const midtoneRegionError = average(midtoneErrors);
  const highlightRegionError = average(highlightErrors);
  const highErrorTailRatio = channelErrorAbove08Count / channelSampleCount;
  const strictMaximumPassed = maximumError <= 0.08;
  const sparseInterpolationTailPassed =
    p999Error <= 0.03 && maximumError <= 0.125 && highErrorTailRatio <= 0.0001;
  const passed =
    rgbMeanAbsoluteError <= 0.012 &&
    p95Error <= 0.025 &&
    (strictMaximumPassed || sparseInterpolationTailPassed);
  const diagnosis = getDiagnosis(
    passed,
    rgbMeanAbsoluteError,
    linearLightMeanAbsoluteError,
    darkRegionError,
    midtoneRegionError,
    highlightRegionError,
    luminanceError,
    saturationError
  );
  const notes: string[] = [];

  if (passed && !strictMaximumPassed && sparseInterpolationTailPassed) {
    notes.push("The main error distribution passed; sparse gamut-cusp interpolation outliers remained within the strict tail budget.");
  }

  if (passed) {
    notes.push("实际 Render 与网站 Expected Output 在 8-bit 回读容差内一致。");
  } else if (diagnosis === "range-mismatch-suspected") {
    notes.push("暗部与高光端点误差显著，优先检查 DaVinci Data Levels 与输入 Profile 的 Full / Legal 设置。");
  } else if (diagnosis === "gamma-mismatch-suspected") {
    notes.push("中间调误差高于端点，优先检查 Gamma 2.2、Gamma 2.4 与 sRGB 解释是否一致。");
  } else if (diagnosis === "input-profile-mismatch") {
    notes.push("色度误差高于亮度误差，优先检查输入色域与 Profile 选择。");
  } else {
    notes.push("数值差异尚不能归因于单一环节，请检查导出 Profile、节点顺序和显示管理。");
  }
  notes.push("DaVinci Viewer 截图不能作为精确校准文件；请上传实际导出的 PNG、TIFF 或 DPX 静帧。");

  return {
    width,
    height,
    pixelCount,
    rgbMeanAbsoluteError,
    linearLightMeanAbsoluteError,
    p95Error,
    p99Error,
    p999Error,
    maximumError,
    channelSampleCount,
    channelErrorAbove025Count,
    channelErrorAbove04Count,
    channelErrorAbove08Count,
    neutralGrayError,
    luminanceError,
    saturationError,
    darkRegionError,
    midtoneRegionError,
    highlightRegionError,
    diagnosis,
    passed,
    notes
  };
};
