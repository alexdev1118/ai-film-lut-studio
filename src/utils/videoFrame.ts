import type { CapturedFrame, MediaItem, VideoSource } from "../types";
import { defaultSrgbInterpretation } from "./colorSpace";

const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024;
const MAX_CAPTURE_LONG_SIDE = 1920;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v"]);

interface CaptureVideoFrameOptions {
  readonly sourceVideoName: string;
  readonly maxLongSide?: number;
}

const getExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

const inferVideoMimeType = (file: File): string => {
  if (file.type.trim().length > 0) {
    return file.type.toLowerCase();
  }

  const extension = getExtension(file.name);

  switch (extension) {
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    default:
      return "";
  }
};

const createFrameId = (): string => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    console.warn("生成视频帧素材 ID 失败，已使用时间戳回退", error);
    return `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  }
};

const formatTimestampForName = (timestamp: number): string => {
  const safeTimestamp = Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : 0;
  const minutes = Math.floor(safeTimestamp / 60);
  const seconds = Math.floor(safeTimestamp % 60);
  const centiseconds = Math.floor((safeTimestamp - Math.floor(safeTimestamp)) * 100);
  return `${minutes}m${seconds.toString().padStart(2, "0")}s${centiseconds.toString().padStart(2, "0")}`;
};

const sanitizeFrameBaseName = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const safeName = baseName.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_");
  return safeName.length > 0 ? safeName : "video-frame";
};

const scaleFrameDimensions = (width: number, height: number, maxLongSide: number): { readonly width: number; readonly height: number } => {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxLongSide) {
    return { width, height };
  }

  const scale = maxLongSide / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const canvasToJpegBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  try {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob === null) {
            reject(new Error("Canvas 未能导出当前视频帧"));
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "当前帧截取失败";
    throw new Error(message);
  }
};

export const validateVideoFile = (file: File): void => {
  const mimeType = inferVideoMimeType(file);
  const extension = getExtension(file.name);

  if (!ALLOWED_VIDEO_TYPES.has(mimeType) && !ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    throw new Error("请上传 MP4、MOV、WebM 或 M4V 视频");
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error("视频文件较大，浏览器本地读取可能较慢，建议先在剪辑软件中导出静帧。");
  }
};

export const createVideoObjectUrl = (file: File): string => {
  try {
    validateVideoFile(file);
    return URL.createObjectURL(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频读取失败，请更换视频文件或先导出静帧。这不是文件上传失败，而是浏览器可能无法解码该视频。";
    throw new Error(message);
  }
};

export const getVideoMetadata = (videoElement: HTMLVideoElement): Pick<VideoSource, "duration" | "width" | "height"> => {
  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight;
  const duration = Number.isFinite(videoElement.duration) && videoElement.duration > 0 ? videoElement.duration : 0;

  if (width <= 0 || height <= 0) {
    throw new Error("视频读取失败，请更换视频文件或先导出静帧。");
  }

  return {
    duration,
    width,
    height
  };
};

export const captureVideoFrame = async (
  videoElement: HTMLVideoElement,
  { sourceVideoName, maxLongSide = MAX_CAPTURE_LONG_SIDE }: CaptureVideoFrameOptions
): Promise<CapturedFrame> => {
  try {
    const metadata = getVideoMetadata(videoElement);
    const dimensions = scaleFrameDimensions(metadata.width, metadata.height, maxLongSide);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (context === null) {
      throw new Error("浏览器无法创建 Canvas 2D 上下文");
    }

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(videoElement, 0, 0, dimensions.width, dimensions.height);

    const blob = await canvasToJpegBlob(canvas);
    const timestamp = Number.isFinite(videoElement.currentTime) && videoElement.currentTime >= 0 ? videoElement.currentTime : 0;
    const name = `${sanitizeFrameBaseName(sourceVideoName)}_frame_${formatTimestampForName(timestamp)}.jpg`;

    return {
      url: URL.createObjectURL(blob),
      name,
      width: dimensions.width,
      height: dimensions.height,
      sourceVideoName,
      timestamp,
      size: blob.size,
      type: "image/jpeg"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "当前帧截取失败，请调整时间点后重试。";
    throw new Error(message);
  }
};

export const capturedFrameToMediaItem = (frame: CapturedFrame): MediaItem => {
  return {
    id: `target-video-frame-${createFrameId()}`,
    sourceType: "target",
    url: frame.url,
    name: frame.name,
    size: frame.size,
    type: frame.type,
    width: frame.width,
    height: frame.height,
    createdAt: new Date().toISOString(),
    origin: "video-frame",
    colorInterpretation: defaultSrgbInterpretation()
  };
};
