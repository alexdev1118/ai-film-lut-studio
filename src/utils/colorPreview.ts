import type { ColorPreviewResult, GenerateColorPreviewParams } from "../types";

interface LoadedImage {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

interface AverageColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const DEFAULT_MAX_SIZE = 1600;

const clamp = (value: number, min = 0, max = 255): number => {
  return Math.min(Math.max(value, min), max);
};

const scaleDimension = (width: number, height: number, maxSize: number): { readonly width: number; readonly height: number } => {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxSize) {
    return { width, height };
  }

  const scale = maxSize / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const getCanvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (context === null) {
    throw new Error("浏览器无法创建 Canvas 2D 上下文");
  }

  return context;
};

const loadImage = async (url: string): Promise<LoadedImage> => {
  try {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.src = url;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片读取失败"));
    });

    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("图片尺寸无效");
    }

    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片读取失败";
    throw new Error(`Canvas 预览图片加载失败：${message}`);
  }
};

const drawScaledImage = (loadedImage: LoadedImage, maxSize: number): { readonly canvas: HTMLCanvasElement; readonly context: CanvasRenderingContext2D } => {
  const dimensions = scaleDimension(loadedImage.width, loadedImage.height, maxSize);
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const context = getCanvasContext(canvas);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(loadedImage.image, 0, 0, dimensions.width, dimensions.height);
  return { canvas, context };
};

const calculateAverageColor = (imageData: ImageData, sampleStep = 8): AverageColor => {
  const data = imageData.data;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4 * sampleStep) {
    const alpha = data[index + 3];

    if (alpha === 0) {
      continue;
    }

    totalR += data[index];
    totalG += data[index + 1];
    totalB += data[index + 2];
    count += 1;
  }

  if (count === 0) {
    return { r: 128, g: 128, b: 128 };
  }

  return {
    r: totalR / count,
    g: totalG / count,
    b: totalB / count
  };
};

const loadAverageColor = async (imageUrl: string, maxSize: number): Promise<AverageColor> => {
  const loadedImage = await loadImage(imageUrl);
  const scaled = drawScaledImage(loadedImage, Math.min(maxSize, 480));
  const imageData = scaled.context.getImageData(0, 0, scaled.canvas.width, scaled.canvas.height);
  return calculateAverageColor(imageData, 6);
};

const canvasToObjectUrl = async (canvas: HTMLCanvasElement): Promise<string> => {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result === null) {
          reject(new Error("Canvas 导出失败"));
          return;
        }

        resolve(result);
      }, "image/jpeg", 0.92);
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canvas 导出失败";
    throw new Error(message);
  }
};

export const revokeColorPreviewUrl = (previewUrl: string | null | undefined): void => {
  try {
    if (previewUrl !== null && previewUrl !== undefined && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  } catch (error) {
    console.warn("释放 Canvas 预览 URL 失败", error);
  }
};

export const generateColorPreview = async ({
  targetImageUrl,
  referenceImageUrl,
  adjustments,
  maxSize = DEFAULT_MAX_SIZE
}: GenerateColorPreviewParams): Promise<ColorPreviewResult> => {
  try {
    const loadedTarget = await loadImage(targetImageUrl);
    const { canvas, context } = drawScaledImage(loadedTarget, maxSize);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const targetAverage = calculateAverageColor(imageData, 10);
    const referenceAverage = referenceImageUrl === undefined ? undefined : await loadAverageColor(referenceImageUrl, maxSize);
    const intensity = clamp(adjustments.intensity, 0, 100) / 100;
    const contrastValue = clamp(adjustments.contrast, -100, 100) * 1.8;
    const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));
    const saturationFactor = 1 + clamp(adjustments.saturation, -100, 100) / 100;
    const temperatureShift = clamp(adjustments.temperature, -50, 50) * 1.15;
    const tintShift = clamp(adjustments.tint, -50, 50) * 0.9;
    const shadowShift = clamp(adjustments.shadowMatch, 0, 100) / 100;
    const midtoneShift = clamp(adjustments.midtoneMatch, 0, 100) / 100;
    const highlightShift = clamp(adjustments.highlightMatch, 0, 100) / 100;
    const referenceStrength = referenceAverage === undefined ? 0 : Math.min(0.24, 0.08 + intensity * 0.16);
    const lumaPreserveStrength = adjustments.preserveLuma ? 0.52 : 0.18;
    const saturationCeiling = adjustments.preventOversaturation ? 246 : 255;

    for (let index = 0; index < data.length; index += 4) {
      const originalR = data[index];
      const originalG = data[index + 1];
      const originalB = data[index + 2];
      const originalLuma = 0.299 * originalR + 0.587 * originalG + 0.114 * originalB;
      let r = originalR;
      let g = originalG;
      let b = originalB;

      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;

      r += temperatureShift;
      b -= temperatureShift;

      r += tintShift * 0.55;
      b += tintShift * 0.55;
      g -= tintShift;

      const luma = originalLuma / 255;

      if (luma < 0.33) {
        r += (shadowShift - 0.5) * 15;
        b += (0.5 - shadowShift) * 9;
        g += (shadowShift - 0.5) * 4;
      } else if (luma < 0.66) {
        r += (midtoneShift - 0.5) * 13;
        g += (midtoneShift - 0.5) * 7;
        b -= (midtoneShift - 0.5) * 5;
      } else {
        r += (highlightShift - 0.5) * 9;
        g += (highlightShift - 0.5) * 5;
        b -= (highlightShift - 0.5) * 7;
      }

      if (referenceAverage !== undefined) {
        r += (referenceAverage.r - targetAverage.r) * referenceStrength;
        g += (referenceAverage.g - targetAverage.g) * referenceStrength;
        b += (referenceAverage.b - targetAverage.b) * referenceStrength;
      }

      if (adjustments.skinToneProtection) {
        const maxChannel = Math.max(originalR, originalG, originalB);
        const minChannel = Math.min(originalR, originalG, originalB);
        const isWarmMidtone = originalR > originalB && originalR > originalG * 0.9 && originalG > originalB * 0.72 && maxChannel - minChannel > 18;

        if (isWarmMidtone && luma > 0.22 && luma < 0.82) {
          r = originalR * 0.34 + r * 0.66;
          g = originalG * 0.28 + g * 0.72;
          b = originalB * 0.34 + b * 0.66;
        }
      }

      if (adjustments.preserveLuma) {
        const adjustedLuma = 0.299 * r + 0.587 * g + 0.114 * b;
        const lumaDelta = originalLuma - adjustedLuma;
        r += lumaDelta * lumaPreserveStrength;
        g += lumaDelta * lumaPreserveStrength;
        b += lumaDelta * lumaPreserveStrength;
      }

      data[index] = clamp(originalR * (1 - intensity) + r * intensity, 0, saturationCeiling);
      data[index + 1] = clamp(originalG * (1 - intensity) + g * intensity, 0, saturationCeiling);
      data[index + 2] = clamp(originalB * (1 - intensity) + b * intensity, 0, saturationCeiling);
    }

    context.putImageData(imageData, 0, 0);
    const previewUrl = await canvasToObjectUrl(canvas);

    return {
      previewUrl,
      width: canvas.width,
      height: canvas.height
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canvas 预览生成失败";
    throw new Error(`预览生成失败，请更换图片或降低图片尺寸。${message}`);
  }
};
