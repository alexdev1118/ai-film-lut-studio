import type { ImageMetadataResult, UploadedImage } from "../types";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);

const TIFF_TYPES = new Set(["image/tiff"]);

const getExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

const inferMimeType = (file: File): string => {
  if (file.type.trim().length > 0) {
    return file.type.toLowerCase();
  }

  const extension = getExtension(file.name);

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "tif":
    case "tiff":
      return "image/tiff";
    default:
      return "";
  }
};

const readImageDimensions = async (objectURL: string, mimeType: string): Promise<{ readonly width: number; readonly height: number }> => {
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectURL;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(TIFF_TYPES.has(mimeType) ? "当前浏览器可能无法预览 TIFF，建议使用 JPG、PNG 或 WebP" : "图片读取失败，请更换图片"));
    });

    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("图片读取失败，请更换图片");
    }

    return {
      width: image.naturalWidth,
      height: image.naturalHeight
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片读取失败，请更换图片";
    throw new Error(message);
  }
};

export const getImageMetadata = async (file: File): Promise<ImageMetadataResult> => {
  let objectURL = "";

  try {
    const mimeType = inferMimeType(file);

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      throw new Error("请上传 JPG、PNG 或 WebP 图片");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("图片过大，请上传 20MB 以下图片");
    }

    objectURL = URL.createObjectURL(file);
    const dimensions = await readImageDimensions(objectURL, mimeType);

    return {
      objectURL,
      width: dimensions.width,
      height: dimensions.height,
      fileName: file.name,
      fileSize: file.size,
      mimeType
    };
  } catch (error) {
    if (objectURL.length > 0) {
      URL.revokeObjectURL(objectURL);
    }

    const message = error instanceof Error ? error.message : "图片读取失败，请更换图片";
    throw new Error(message);
  }
};

export const toUploadedImage = (file: File, metadata: ImageMetadataResult): UploadedImage => {
  return {
    file,
    url: metadata.objectURL,
    name: metadata.fileName,
    size: metadata.fileSize,
    type: metadata.mimeType,
    width: metadata.width,
    height: metadata.height
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const getReadableImageType = (mimeType: string): string => {
  switch (mimeType) {
    case "image/jpeg":
      return "JPG/JPEG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WebP";
    case "image/tiff":
      return "TIFF";
    default:
      return mimeType.length > 0 ? mimeType : "未知格式";
  }
};

export const revokeUploadedImage = (image: UploadedImage | null): void => {
  try {
    if (image !== null) {
      URL.revokeObjectURL(image.url);
    }
  } catch (error) {
    console.warn("释放本地图片预览 URL 失败", error);
  }
};
