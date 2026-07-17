import type { ColorPreviewResult, GenerateColorPreviewParams, ImageColorInterpretation, RgbColor } from "../types";
import { getColorEncodingProfile } from "../data/colorEncodingProfiles";
import { evaluateCubeLut } from "./cubeEvaluator";
import { defaultSrgbInterpretation, expandSignalRange, inputColorToRec709Gamma24, rec709Gamma24ToDisplaySrgb } from "./colorSpace";

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

const calculateAverageColor = (imageData: ImageData, interpretation: ImageColorInterpretation, sampleStep = 8): AverageColor => {
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

    const workingColor = inputColorToRec709Gamma24(
      { r: data[index] / 255, g: data[index + 1] / 255, b: data[index + 2] / 255 },
      interpretation
    );
    totalR += workingColor.r * 255;
    totalG += workingColor.g * 255;
    totalB += workingColor.b * 255;
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

const loadAverageColor = async (imageUrl: string, maxSize: number, interpretation: ImageColorInterpretation): Promise<AverageColor> => {
  const loadedImage = await loadImage(imageUrl);
  const scaled = drawScaledImage(loadedImage, Math.min(maxSize, 480));
  const imageData = scaled.context.getImageData(0, 0, scaled.canvas.width, scaled.canvas.height);
  return calculateAverageColor(imageData, interpretation, 6);
};

export const getAverageColorFromImageUrl = async (
  imageUrl: string,
  maxSize = 480,
  interpretation: ImageColorInterpretation = defaultSrgbInterpretation()
): Promise<RgbColor> => {
  const averageColor = await loadAverageColor(imageUrl, maxSize, interpretation);

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
  parsedLut,
  targetColorInterpretation,
  technicalTransform,
  maxSize = DEFAULT_MAX_SIZE
}: GenerateColorPreviewParams): Promise<ColorPreviewResult> => {
  let previewUrl = "";
  let sourcePreviewUrl = "";

  try {
    const loadedTarget = await loadImage(targetImageUrl);
    const { canvas, context } = drawScaledImage(loadedTarget, maxSize);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const sourceImageData = context.createImageData(canvas.width, canvas.height);
    const outputImageData = context.createImageData(canvas.width, canvas.height);
    const inputData = imageData.data;
    const sourceData = sourceImageData.data;
    const outputData = outputImageData.data;
    const sourceProfile = getColorEncodingProfile(targetColorInterpretation.profileId);

    for (let index = 0; index < inputData.length; index += 4) {
      const rawColor = { r: inputData[index] / 255, g: inputData[index + 1] / 255, b: inputData[index + 2] / 255 };
      const workingInput = technicalTransform === undefined
        ? inputColorToRec709Gamma24(rawColor, targetColorInterpretation)
        : evaluateCubeLut(technicalTransform.parsedLut, expandSignalRange(rawColor, sourceProfile.range));
      const sourceDisplay = rec709Gamma24ToDisplaySrgb(workingInput);
      const outputDisplay = rec709Gamma24ToDisplaySrgb(evaluateCubeLut(parsedLut, workingInput));

      sourceData[index] = clamp(sourceDisplay.r * 255);
      sourceData[index + 1] = clamp(sourceDisplay.g * 255);
      sourceData[index + 2] = clamp(sourceDisplay.b * 255);
      sourceData[index + 3] = inputData[index + 3];
      outputData[index] = clamp(outputDisplay.r * 255);
      outputData[index + 1] = clamp(outputDisplay.g * 255);
      outputData[index + 2] = clamp(outputDisplay.b * 255);
      outputData[index + 3] = inputData[index + 3];
    }

    context.putImageData(sourceImageData, 0, 0);
    sourcePreviewUrl = await canvasToObjectUrl(canvas);
    context.putImageData(outputImageData, 0, 0);
    previewUrl = await canvasToObjectUrl(canvas);

    return {
      previewUrl,
      sourcePreviewUrl,
      width: canvas.width,
      height: canvas.height
    };
  } catch (error) {
    if (previewUrl.length > 0) {
      URL.revokeObjectURL(previewUrl);
    }
    if (sourcePreviewUrl.length > 0) {
      URL.revokeObjectURL(sourcePreviewUrl);
    }
    const message = error instanceof Error ? error.message : "Canvas 预览生成失败";
    throw new Error(`预览生成失败，请更换图片或降低图片尺寸。${message}`);
  }
};
