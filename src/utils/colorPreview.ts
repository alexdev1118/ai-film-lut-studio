import type { ColorPreviewResult, GenerateColorPreviewParams, RgbColor } from "../types";
import { applyLookToRgb } from "./cubeExport";

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

export const getAverageColorFromImageUrl = async (imageUrl: string, maxSize = 480): Promise<RgbColor> => {
  const averageColor = await loadAverageColor(imageUrl, maxSize);

  return {
    r: averageColor.r / 255,
    g: averageColor.g / 255,
    b: averageColor.b / 255
  };
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
    const referenceAverage = referenceImageUrl === undefined ? undefined : await getAverageColorFromImageUrl(referenceImageUrl, maxSize);

    for (let index = 0; index < data.length; index += 4) {
      const output = applyLookToRgb(
        {
          r: data[index] / 255,
          g: data[index + 1] / 255,
          b: data[index + 2] / 255
        },
        adjustments,
        referenceAverage
      );

      data[index] = clamp(output.r * 255);
      data[index + 1] = clamp(output.g * 255);
      data[index + 2] = clamp(output.b * 255);
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
