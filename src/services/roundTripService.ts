import { getColorEncodingProfile } from "../data/colorEncodingProfiles";
import type {
  ColorEncodingProfileId,
  RoundTripAssetRole,
  RoundTripAssetSummary,
  RoundTripCubeContract,
  RoundTripPixelFrame,
  RoundTripValidationResult
} from "../types";
import { convertSourceToPostInput } from "../utils/colorSpace";
import { createCubeContentHash } from "../utils/lutConsistency";
import { parseCubeLut } from "../utils/cubeParser";
import { validateCubeLut } from "../utils/cubeValidate";
import { sha256ArrayBuffer } from "../utils/contentHash";
import { decodeDpxFileToPreview, isDpxFile } from "../utils/dpx/dpxPreview";
import { DpxDecodeError } from "../utils/dpx/dpxTypes";
import { assessRoundTripSameFrame, releaseRoundTripObjectUrl, validateRoundTripFrames } from "../utils/roundTripValidation";

export interface RoundTripLoadedAsset extends RoundTripAssetSummary {
  readonly originalFile: File;
}

export interface LoadRoundTripAssetParams {
  readonly file: File;
  readonly role: RoundTripAssetRole;
  readonly profileId: ColorEncodingProfileId;
}

export interface LoadRoundTripCubeParams {
  readonly file: File;
  readonly currentWorkspaceCubeHash?: string;
}

export interface LoadedRoundTripCube {
  readonly contract: RoundTripCubeContract;
  readonly content: string;
}

export interface RunRoundTripValidationParams {
  readonly pre: RoundTripLoadedAsset;
  readonly post: RoundTripLoadedAsset;
  readonly cube: LoadedRoundTripCube;
  readonly maxLongEdge?: number;
}

interface LoadedImage {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
}

const allowedRenderPattern = /\.(png|tif|tiff|dpx)$/i;
const maximumRenderBytes = 512 * 1024 * 1024;
const maximumCubeBytes = 32 * 1024 * 1024;

const loadImage = async (url: string, label: string): Promise<LoadedImage> => {
  try {
    if (url.trim().length === 0) {
      throw new Error(`${label} URL 为空。`);
    }
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`${label} 无法被当前浏览器解码。`));
    });
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error(`${label} 尺寸无效。`);
    }
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label} 读取失败。`;
    throw new Error(message);
  }
};

const readBrowserImage = async (file: File): Promise<{ readonly url: string; readonly width: number; readonly height: number; readonly container: "png" | "tiff" }> => {
  let url = "";
  try {
    url = URL.createObjectURL(file);
    const loaded = await loadImage(url, "DaVinci 静帧");
    return {
      url,
      width: loaded.width,
      height: loaded.height,
      container: /\.tiff?$/i.test(file.name) ? "tiff" : "png"
    };
  } catch (error) {
    releaseRoundTripObjectUrl(url);
    const message = error instanceof Error ? error.message : "DaVinci 静帧读取失败。";
    throw new Error(message);
  }
};

const validateRenderFile = (file: File): void => {
  if (!allowedRenderPattern.test(file.name)) {
    throw new Error("请上传 DaVinci 实际导出的 PNG、TIFF 或 DPX 静帧；Viewer 截图和 JPEG 不能用于数值验收。");
  }
  if (file.size <= 0) {
    throw new Error("DaVinci 静帧文件为空。");
  }
  if (file.size > maximumRenderBytes) {
    throw new Error("DaVinci 静帧超过 512MB，浏览器本地读取存在内存风险。请降低静帧分辨率后重试。");
  }
};

const collectCubeComment = (comments: readonly string[], label: string): string | undefined => {
  const prefix = `${label}:`.toLowerCase();
  const comment = comments.find((entry) => entry.toLowerCase().startsWith(prefix));
  return comment === undefined ? undefined : comment.slice(prefix.length).trim();
};

const toDpxSummary = (decoded: Awaited<ReturnType<typeof decodeDpxFileToPreview>>): NonNullable<RoundTripAssetSummary["dpx"]> => ({
  magicNumber: decoded.metadata.header.magicNumber,
  endianness: decoded.metadata.header.endianness,
  bitDepth: decoded.metadata.imageElement.bitDepth,
  descriptor: decoded.metadata.imageElement.descriptor,
  channelOrder: decoded.metadata.imageElement.channelOrder,
  packing: decoded.metadata.imageElement.packing,
  encoding: decoded.metadata.imageElement.encoding,
  dataSign: decoded.metadata.imageElement.dataSign,
  transferCharacteristic: decoded.metadata.imageElement.transferCharacteristic,
  colorimetricSpecification: decoded.metadata.imageElement.colorimetricSpecification,
  orientation: decoded.metadata.header.orientation,
  linePadding: decoded.metadata.imageElement.linePadding,
  imagePadding: decoded.metadata.imageElement.imagePadding
});

export const loadRoundTripAsset = async ({ file, role, profileId }: LoadRoundTripAssetParams): Promise<RoundTripLoadedAsset> => {
  try {
    validateRenderFile(file);
    const contentHash = await sha256ArrayBuffer(await file.arrayBuffer());
    if (isDpxFile(file)) {
      const decoded = await decodeDpxFileToPreview(file);
      return {
        role,
        name: file.name,
        size: file.size,
        contentHash,
        width: decoded.previewWidth,
        height: decoded.previewHeight,
        container: "dpx",
        profileId,
        decodeStatus: "decoded",
        url: decoded.previewUrl,
        dpx: toDpxSummary(decoded),
        originalFile: file
      };
    }

    const browserImage = await readBrowserImage(file);
    return {
      role,
      name: file.name,
      size: file.size,
      contentHash,
      width: browserImage.width,
      height: browserImage.height,
      container: browserImage.container,
      profileId,
      decodeStatus: "decoded",
      url: browserImage.url,
      originalFile: file
    };
  } catch (error) {
    const message = error instanceof DpxDecodeError
      ? `${error.support.message} ${error.support.suggestion}`
      : error instanceof Error
        ? error.message
        : "DaVinci 静帧读取失败。";
    throw new Error(`无法加载 ${role === "pre" ? "PRE" : "POST"} 静帧：${message}`);
  }
};

export const releaseRoundTripAsset = (asset: RoundTripLoadedAsset | null): void => {
  releaseRoundTripObjectUrl(asset?.url);
};

export const loadRoundTripCube = async ({ file, currentWorkspaceCubeHash }: LoadRoundTripCubeParams): Promise<LoadedRoundTripCube> => {
  try {
    if (!/\.cube$/i.test(file.name)) {
      throw new Error("请上传实际应用在 DaVinci 节点上的 .cube 文件。");
    }
    if (file.size <= 0 || file.size > maximumCubeBytes) {
      throw new Error(".cube 文件为空或超过 32MB 安全上限。");
    }
    const content = await file.text();
    const validation = validateCubeLut(content);
    if (!validation.isValid) {
      throw new Error(`.cube 基础格式校验失败：${validation.errors.join("；")}`);
    }
    const parsed = parseCubeLut(content);
    const contentHash = await createCubeContentHash(content);
    const currentWorkspaceCubeMatch = currentWorkspaceCubeHash === undefined
      ? "not-available"
      : currentWorkspaceCubeHash === contentHash
        ? "matched"
        : "mismatched";
    const contract: RoundTripCubeContract = {
      fileName: file.name,
      contentHash,
      ...(parsed.lut.title === undefined ? {} : { title: parsed.lut.title }),
      lutSize: parsed.lut.size,
      dataLineCount: validation.dataLineCount ?? parsed.lut.size ** 3,
      expectedDataLineCount: parsed.lut.size ** 3,
      inputContract: collectCubeComment(parsed.lut.comments, "Input Contract"),
      outputContract: collectCubeComment(parsed.lut.comments, "Output Contract"),
      inputProfileId: collectCubeComment(parsed.lut.comments, "Input Profile ID"),
      outputProfileId: collectCubeComment(parsed.lut.comments, "Output Profile ID"),
      range: collectCubeComment(parsed.lut.comments, "Range"),
      transferFunction: collectCubeComment(parsed.lut.comments, "Transfer Function"),
      technicalConversionIncluded: collectCubeComment(parsed.lut.comments, "Technical Conversion Included"),
      validationPassed: true,
      currentWorkspaceCubeMatch,
      warnings: [...validation.warnings, ...parsed.warnings]
    };
    return { contract, content };
  } catch (error) {
    const message = error instanceof Error ? error.message : ".cube 读取失败。";
    throw new Error(`无法加载实际使用的 Cube：${message}`);
  }
};

const getComparisonDimensions = (width: number, height: number, maxLongEdge: number): { readonly width: number; readonly height: number } => {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }
  const scale = maxLongEdge / longEdge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

const renderFrame = (loaded: LoadedImage, width: number, height: number): RoundTripPixelFrame => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("浏览器无法创建 Round-trip Canvas 上下文。");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(loaded.image, 0, 0, width, height);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
};

const convertToPostContractFrame = (frame: RoundTripPixelFrame, profileId: ColorEncodingProfileId): RoundTripPixelFrame => {
  const profile = getColorEncodingProfile(profileId);
  if (profile.status === "warning-only") {
    throw new Error(`Profile “${profile.displayName}” 未确认，不能用于可靠的 Round-trip 数值验收。`);
  }
  const data = new Uint8ClampedArray(frame.data.length);
  for (let index = 0; index < frame.data.length; index += 4) {
    const converted = convertSourceToPostInput({
      r: frame.data[index] / 255,
      g: frame.data[index + 1] / 255,
      b: frame.data[index + 2] / 255
    }, profileId).color;
    data[index] = Math.round(converted.r * 255);
    data[index + 1] = Math.round(converted.g * 255);
    data[index + 2] = Math.round(converted.b * 255);
    data[index + 3] = frame.data[index + 3];
  }
  return { width: frame.width, height: frame.height, data };
};

export const runRoundTripValidation = async ({ pre, post, cube, maxLongEdge = 1200 }: RunRoundTripValidationParams): Promise<RoundTripValidationResult> => {
  try {
    if (!Number.isFinite(maxLongEdge) || maxLongEdge < 256 || maxLongEdge > 4096) {
      throw new Error("Round-trip 比较长边限制必须在 256 到 4096 像素之间。");
    }
    if (pre.width !== post.width || pre.height !== post.height) {
      const parsed = parseCubeLut(cube.content);
      return validateRoundTripFrames({
        pre: { width: pre.width, height: pre.height, data: new Uint8ClampedArray(pre.width * pre.height * 4) },
        post: { width: post.width, height: post.height, data: new Uint8ClampedArray(post.width * post.height * 4) },
        cube: parsed.lut,
        cubeMatchesCurrentWorkspace: cube.contract.currentWorkspaceCubeMatch
      });
    }
    const [preImage, postImage] = await Promise.all([loadImage(pre.url, "PRE 静帧"), loadImage(post.url, "POST 静帧")]);
    const dimensions = getComparisonDimensions(pre.width, pre.height, maxLongEdge);
    const preRaw = renderFrame(preImage, dimensions.width, dimensions.height);
    const postRaw = renderFrame(postImage, dimensions.width, dimensions.height);
    const parsed = parseCubeLut(cube.content);
    return validateRoundTripFrames({
      pre: convertToPostContractFrame(preRaw, pre.profileId),
      post: convertToPostContractFrame(postRaw, post.profileId),
      cube: parsed.lut,
      cubeMatchesCurrentWorkspace: cube.contract.currentWorkspaceCubeMatch,
      sameFrameAssessment: assessRoundTripSameFrame(preRaw, postRaw)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Round-trip 数值验收失败。";
    throw new Error(`DaVinci Round-trip 验收失败：${message}`);
  }
};
