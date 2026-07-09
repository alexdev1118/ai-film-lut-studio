import { colorAnalysisReport } from "../data/analysis";
import { previewImages } from "../data/mockImages";
import { generateColorPreview, getAverageColorFromImageUrl } from "../utils/colorPreview";
import { downloadCubeLut, generateCubeLut } from "../utils/cubeExport";
import { validateCubeLut } from "../utils/cubeValidate";
import type {
  ColorAnalysisInput,
  ColorAnalysisReport,
  CubeExportResult,
  ExportCubeLutParams,
  ExportLutParams,
  ExportLutResult,
  GenerateLocalPreviewParams,
  GeneratePreviewParams,
  PhotoPresetParams,
  PhotoPresetResult,
  PreviewResult
} from "../types";

const delay = async (milliseconds: number): Promise<void> => {
  try {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown timer failure";
    throw new Error(`模拟服务延迟失败：${message}`);
  }
};

export const generatePreviewMock = async (params: GeneratePreviewParams): Promise<PreviewResult> => {
  try {
    if (params.targetFrameName.trim().length === 0) {
      throw new Error("缺少目标静帧名称。");
    }

    if (params.referenceImageName.trim().length === 0 && params.selectedStyleName.trim().length === 0) {
      throw new Error("请上传参考图或选择风格。");
    }

    await delay(1500);

    return {
      id: `preview-${Date.now()}`,
      status: "预览已生成",
      styleName: params.selectedStyleName,
      previewImage: previewImages.tealOrange,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown preview generation failure";
    throw new Error(`生成仿色预览失败：${message}`);
  }
};

export const generateLocalColorPreview = async (params: GenerateLocalPreviewParams): Promise<PreviewResult> => {
  try {
    if (params.targetImageUrl.trim().length === 0) {
      throw new Error("缺少目标图片。");
    }

    const colorPreview = await generateColorPreview({
      targetImageUrl: params.targetImageUrl,
      referenceImageUrl: params.referenceImageUrl,
      adjustments: {
        intensity: params.parameters.intensity,
        contrast: params.parameters.contrast,
        saturation: params.parameters.saturation,
        temperature: params.parameters.temperature,
        tint: params.parameters.tint,
        shadowMatch: params.parameters.shadowMatch,
        midtoneMatch: params.parameters.midtoneMatch,
        highlightMatch: params.parameters.highlightMatch,
        skinToneProtection: params.skinToneProtection,
        preserveLuma: params.preserveLuma,
        preventOversaturation: params.preventOversaturation
      },
      maxSize: 1600
    });

    return {
      id: `canvas-preview-${Date.now()}`,
      status: "预览已生成",
      styleName: params.selectedStyleName,
      previewImage: colorPreview.previewUrl,
      generatedAt: new Date().toISOString(),
      width: colorPreview.width,
      height: colorPreview.height,
      isCanvasPreview: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown local preview generation failure";
    throw new Error(message);
  }
};

export const exportLutMock = async (params: ExportLutParams): Promise<ExportLutResult> => {
  try {
    if (params.styleName.trim().length === 0) {
      throw new Error("缺少导出风格名称。");
    }

    await delay(450);

    return {
      fileName: `${params.styleName.replace(/\s+/g, "-").toLowerCase()}-${params.parameters.precision}.cube`,
      fileSize: params.parameters.precision === "65x65x65" ? "4.8 MB" : params.parameters.precision === "33x33x33" ? "620 KB" : "92 KB",
      precision: params.parameters.precision,
      status: "导出已准备"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LUT export failure";
    throw new Error(`导出 LUT 失败：${message}`);
  }
};

export const exportCubeLut = async (params: ExportCubeLutParams): Promise<CubeExportResult> => {
  try {
    const referenceAverageColor =
      params.referenceAverageColor ?? (params.referenceImageUrl === undefined ? undefined : await getAverageColorFromImageUrl(params.referenceImageUrl));
    const result = generateCubeLut({
      lutName: params.lutName,
      lutSize: params.lutSize,
      adjustments: {
        intensity: params.parameters.intensity,
        contrast: params.parameters.contrast,
        saturation: params.parameters.saturation,
        temperature: params.parameters.temperature,
        tint: params.parameters.tint,
        shadowMatch: params.parameters.shadowMatch,
        midtoneMatch: params.parameters.midtoneMatch,
        highlightMatch: params.parameters.highlightMatch,
        skinToneProtection: params.skinToneProtection,
        preserveLuma: params.preserveLuma,
        preventOversaturation: params.preventOversaturation
      },
      referenceAverageColor
    });
    const validation = validateCubeLut(result.content);

    if (!validation.isValid) {
      throw new Error(`LUT 文件校验失败，请检查参数后重试：${validation.errors.join(" ")}`);
    }

    const validatedResult: CubeExportResult = {
      ...result,
      dataLineCount: validation.dataLineCount,
      isValid: validation.isValid,
      validationErrors: validation.errors,
      validationWarnings: validation.warnings
    };
    downloadCubeLut(validatedResult);
    return validatedResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cube export failure";
    throw new Error(message.startsWith("LUT 文件校验失败") ? message : `LUT 导出失败，请稍后重试。${message}`);
  }
};

export const analyzeColorMock = async (image: ColorAnalysisInput): Promise<ColorAnalysisReport> => {
  try {
    if (image.imageName.trim().length === 0) {
      throw new Error("缺少待分析图片名称。");
    }

    await delay(650);
    return colorAnalysisReport;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown color analysis failure";
    throw new Error(`色彩分析失败：${message}`);
  }
};

export const generatePhotoPresetMock = async (params: PhotoPresetParams): Promise<PhotoPresetResult> => {
  try {
    if (params.sourceImageName.trim().length === 0) {
      throw new Error("缺少图片名称。");
    }

    if (params.intensity < 0 || params.intensity > 100) {
      throw new Error("风格强度必须在 0 到 100 之间。");
    }

    await delay(900);

    return {
      status: "图片预设已生成",
      previewImage: previewImages.creamPortrait,
      styleName: params.styleName
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown photo preset failure";
    throw new Error(`生成图片预设失败：${message}`);
  }
};
