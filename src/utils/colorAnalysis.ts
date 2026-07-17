import type { ImageColorInterpretation, RgbColor } from "../types";
import type { ImageColorStatistics, LuminancePercentiles, ToneZoneColorStatistics } from "../types/lutValidation";
import { defaultSrgbInterpretation, inputColorToRec709Gamma24 } from "./colorSpace";

const ANALYSIS_MAX_LONG_SIDE = 640;

interface AnalysisCanvasImage {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const luminance = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

const saturation = (r: number, g: number, b: number): number => {
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  return maximum <= 0 ? 0 : clamp01((maximum - minimum) / maximum);
};

const percentileFromHistogram = (histogram: readonly number[], count: number, ratio: number): number => {
  if (count <= 0) {
    return 0;
  }

  const threshold = Math.max(0, Math.ceil(count * ratio) - 1);
  let total = 0;

  for (let index = 0; index < histogram.length; index += 1) {
    total += histogram[index] ?? 0;
    if (total > threshold) {
      return index / 255;
    }
  }

  return 1;
};

const createZoneAccumulator = () => ({
  count: 0,
  r: 0,
  g: 0,
  b: 0,
  saturation: 0
});

type ZoneAccumulator = ReturnType<typeof createZoneAccumulator>;

const toZoneStatistics = (zone: ZoneAccumulator): ToneZoneColorStatistics => {
  if (zone.count === 0) {
    return {
      pixelCount: 0,
      average: { r: 0, g: 0, b: 0 },
      averageSaturation: 0
    };
  }

  return {
    pixelCount: zone.count,
    average: { r: zone.r / zone.count, g: zone.g / zone.count, b: zone.b / zone.count },
    averageSaturation: zone.saturation / zone.count
  };
};

const addToZone = (zone: ZoneAccumulator, r: number, g: number, b: number, pixelSaturation: number): void => {
  zone.count += 1;
  zone.r += r;
  zone.g += g;
  zone.b += b;
  zone.saturation += pixelSaturation;
};

const validateRgbaInput = (data: Uint8ClampedArray, width: number, height: number): void => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("色彩分析需要有效的图像宽高。");
  }
  if (data.length !== width * height * 4) {
    throw new Error("色彩分析像素长度与图像宽高不匹配。");
  }
};

export const analyzeRgbaPixels = (data: Uint8ClampedArray, width: number, height: number): ImageColorStatistics => {
  validateRgbaInput(data, width, height);
  const redHistogram = new Array<number>(256).fill(0);
  const greenHistogram = new Array<number>(256).fill(0);
  const blueHistogram = new Array<number>(256).fill(0);
  const luminanceHistogram = new Array<number>(256).fill(0);
  const saturationHistogram = new Array<number>(256).fill(0);
  const shadows = createZoneAccumulator();
  const midtones = createZoneAccumulator();
  const highlights = createZoneAccumulator();
  let pixelCount = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalLuminance = 0;
  let totalSaturation = 0;
  let blackClipCount = 0;
  let highlightClipCount = 0;
  let highSaturationRedCount = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue;
    }

    const r = (data[index] ?? 0) / 255;
    const g = (data[index + 1] ?? 0) / 255;
    const b = (data[index + 2] ?? 0) / 255;
    const pixelLuminance = luminance(r, g, b);
    const pixelSaturation = saturation(r, g, b);
    const redIndex = Math.round(r * 255);
    const greenIndex = Math.round(g * 255);
    const blueIndex = Math.round(b * 255);
    const luminanceIndex = Math.round(pixelLuminance * 255);
    const saturationIndex = Math.round(pixelSaturation * 255);

    pixelCount += 1;
    totalR += r;
    totalG += g;
    totalB += b;
    totalLuminance += pixelLuminance;
    totalSaturation += pixelSaturation;
    redHistogram[redIndex] += 1;
    greenHistogram[greenIndex] += 1;
    blueHistogram[blueIndex] += 1;
    luminanceHistogram[luminanceIndex] += 1;
    saturationHistogram[saturationIndex] += 1;

    if (pixelLuminance <= 0.02) {
      blackClipCount += 1;
    }
    if (pixelLuminance >= 0.98) {
      highlightClipCount += 1;
    }
    if (r >= 0.72 && r >= g * 1.3 && r >= b * 1.3 && pixelSaturation >= 0.62) {
      highSaturationRedCount += 1;
    }

    if (pixelLuminance < 0.33) {
      addToZone(shadows, r, g, b, pixelSaturation);
    } else if (pixelLuminance < 0.66) {
      addToZone(midtones, r, g, b, pixelSaturation);
    } else {
      addToZone(highlights, r, g, b, pixelSaturation);
    }
  }

  if (pixelCount === 0) {
    throw new Error("色彩分析未找到可见像素。");
  }

  const average: RgbColor = { r: totalR / pixelCount, g: totalG / pixelCount, b: totalB / pixelCount };
  const luminancePercentiles: LuminancePercentiles = {
    p05: percentileFromHistogram(luminanceHistogram, pixelCount, 0.05),
    p25: percentileFromHistogram(luminanceHistogram, pixelCount, 0.25),
    p50: percentileFromHistogram(luminanceHistogram, pixelCount, 0.5),
    p75: percentileFromHistogram(luminanceHistogram, pixelCount, 0.75),
    p95: percentileFromHistogram(luminanceHistogram, pixelCount, 0.95)
  };

  return {
    pixelCount,
    rgb: {
      average,
      median: {
        r: percentileFromHistogram(redHistogram, pixelCount, 0.5),
        g: percentileFromHistogram(greenHistogram, pixelCount, 0.5),
        b: percentileFromHistogram(blueHistogram, pixelCount, 0.5)
      }
    },
    luminanceAverage: totalLuminance / pixelCount,
    luminance: luminancePercentiles,
    blackClipRatio: blackClipCount / pixelCount,
    highlightClipRatio: highlightClipCount / pixelCount,
    saturationAverage: totalSaturation / pixelCount,
    saturationP95: percentileFromHistogram(saturationHistogram, pixelCount, 0.95),
    temperatureBias: average.r - average.b,
    tintBias: (average.r + average.b) / 2 - average.g,
    highSaturationRedRatio: highSaturationRedCount / pixelCount,
    shadows: toZoneStatistics(shadows),
    midtones: toZoneStatistics(midtones),
    highlights: toZoneStatistics(highlights)
  };
};

const loadImage = async (url: string): Promise<AnalysisCanvasImage> => {
  try {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("无法读取分析图片。"));
    });
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("分析图片尺寸无效。");
    }
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法读取分析图片。";
    throw new Error(`本地自动色彩分析失败：${message}`);
  }
};

const scaleDimensions = (width: number, height: number): { readonly width: number; readonly height: number } => {
  const longSide = Math.max(width, height);
  if (longSide <= ANALYSIS_MAX_LONG_SIDE) {
    return { width, height };
  }
  const scale = ANALYSIS_MAX_LONG_SIDE / longSide;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

export const analyzeImageUrl = async (
  url: string,
  interpretation: ImageColorInterpretation = defaultSrgbInterpretation()
): Promise<ImageColorStatistics> => {
  const loaded = await loadImage(url);
  const dimensions = scaleDimensions(loaded.width, loaded.height);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (context === null) {
    throw new Error("浏览器无法创建色彩分析 Canvas。 ");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(loaded.image, 0, 0, dimensions.width, dimensions.height);
  const imageData = context.getImageData(0, 0, dimensions.width, dimensions.height);
  const normalized = new Uint8ClampedArray(imageData.data.length);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const working = inputColorToRec709Gamma24(
      {
        r: imageData.data[index] / 255,
        g: imageData.data[index + 1] / 255,
        b: imageData.data[index + 2] / 255
      },
      interpretation
    );
    normalized[index] = Math.round(working.r * 255);
    normalized[index + 1] = Math.round(working.g * 255);
    normalized[index + 2] = Math.round(working.b * 255);
    normalized[index + 3] = imageData.data[index + 3];
  }
  return analyzeRgbaPixels(normalized, dimensions.width, dimensions.height);
};
