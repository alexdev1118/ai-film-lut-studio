import type { MediaItem, MediaSourceType } from "../../types";
import { createMediaId } from "../image";
import { defaultDpxInterpretation } from "../colorSpace";
import { decodeDpxPixels } from "./dpxDecoder";
import { parseDpxMetadata } from "./dpxParser";
import { DPX_MAX_SOURCE_FILE_BYTES, DpxDecodeError, type DpxDecodeProgressHandler, type DpxPreviewResult, type DpxSupportStatus } from "./dpxTypes";

const DPX_EXTENSION = /\.dpx$/i;

const rejectUnsupportedFile = (code: string, message: string, suggestion: string): never => {
  const support: DpxSupportStatus = { state: "unsupported", code, message, suggestion };
  throw new DpxDecodeError(support);
};

const emitProgress = (handler: DpxDecodeProgressHandler | undefined, phase: Parameters<DpxDecodeProgressHandler>[0]["phase"], message: string): void => {
  handler?.({ phase, message });
};

const canvasToPreviewUrl = async (width: number, height: number, pixels: Uint8ClampedArray): Promise<string> => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (context === null) {
      throw new Error("浏览器无法创建 Canvas 2D 上下文。");
    }

    const imageData = context.createImageData(width, height);
    imageData.data.set(pixels);
    context.putImageData(imageData, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result === null) {
          reject(new Error("DPX 预览导出失败。"));
          return;
        }
        resolve(result);
      }, "image/png");
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DPX 预览生成失败。";
    throw new Error(message);
  }
};

export const isDpxFile = (file: File): boolean => DPX_EXTENSION.test(file.name);

export const decodeDpxFileToPreview = async (file: File, onProgress?: DpxDecodeProgressHandler): Promise<DpxPreviewResult> => {
  let previewUrl = "";

  try {
    if (!isDpxFile(file)) {
      throw new Error("请选择 .dpx 格式的静帧文件。");
    }
    if (file.size <= 0) {
      throw new Error("DPX 文件为空，请重新导出静帧后再试。");
    }
    if (file.size > DPX_MAX_SOURCE_FILE_BYTES) {
      rejectUnsupportedFile(
        "file-too-large",
        "DPX 文件超过 512MB，浏览器本地读取可能造成内存风险。",
        "建议在 DaVinci Resolve 中导出 PNG / TIFF，或降低静帧分辨率后再导入。"
      );
    }

    emitProgress(onProgress, "reading", "正在读取本地 DPX 文件...");
    const buffer = await file.arrayBuffer();
    emitProgress(onProgress, "parsing-header", "正在解析 DPX Header...");
    const metadata = parseDpxMetadata(buffer, file.name, file.size);
    emitProgress(onProgress, "decoding-pixels", `正在解码 ${metadata.imageElement.bitDepth}-bit ${metadata.imageElement.channelOrder} DPX 像素...`);
    const pixels = decodeDpxPixels(buffer, metadata);
    emitProgress(onProgress, "generating-preview", "正在生成本地 DPX 预览...");
    previewUrl = await canvasToPreviewUrl(pixels.width, pixels.height, pixels.data);
    emitProgress(onProgress, "complete", "已生成本地预览，未应用 Log 技术转换。");

    return {
      metadata,
      previewUrl,
      previewWidth: pixels.width,
      previewHeight: pixels.height
    };
  } catch (error) {
    if (previewUrl.length > 0) {
      URL.revokeObjectURL(previewUrl);
    }
    if (error instanceof DpxDecodeError) {
      emitProgress(onProgress, error.support.state === "unsupported" ? "unsupported" : "failed", error.support.message);
      throw error;
    }
    const message = error instanceof Error ? error.message : "DPX 读取失败。";
    emitProgress(onProgress, "failed", message);
    throw new Error(message);
  }
};

export const dpxPreviewToMediaItem = (file: File, sourceType: MediaSourceType, preview: DpxPreviewResult): MediaItem => {
  const { metadata } = preview;

  return {
    id: createMediaId(sourceType),
    sourceType,
    url: preview.previewUrl,
    name: file.name,
    size: file.size,
    type: "image/x-dpx",
    width: metadata.header.width,
    height: metadata.header.height,
    createdAt: new Date().toISOString(),
    origin: "dpx-preview",
    originalFormat: "DPX",
    sourceBitDepth: metadata.imageElement.bitDepth,
    sourceDescriptor: metadata.imageElement.descriptor,
    sourcePacking: metadata.imageElement.packing,
    sourceEncoding: metadata.imageElement.encoding,
    sourceDataSign: metadata.imageElement.dataSign,
    sourceTransfer: metadata.imageElement.transferCharacteristic,
    sourceColorimetric: metadata.imageElement.colorimetricSpecification,
    endian: metadata.header.endianness,
    previewConverted: true,
    colorTransformApplied: false,
    previewStatus: "local-preview-no-technical-transform",
    colorInterpretation: defaultDpxInterpretation(
      `Header Transfer=${metadata.imageElement.transferCharacteristic}，Colorimetric=${metadata.imageElement.colorimetricSpecification}；原始值仅作线索，需结合 DaVinci 导出设置人工确认。`
    )
  };
};
