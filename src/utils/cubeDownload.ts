import type { CubeDownloadArtifact, PostLutPreparedData } from "../types";
import { createCubeContentHash } from "./lutConsistency";
import { parseCubeLut } from "./cubeParser";
import { validateCubeLut } from "./cubeValidate";

const cubeMimeType = "text/plain;charset=utf-8" as const;
const objectUrlRevocationDelayMs = 10_000;

export interface CubeDownloadAnchor {
  href: string;
  download: string;
  rel: string;
  style: { display: string };
  appendToDocument: () => void;
  click: () => void;
  remove: () => void;
}

export interface CubeDownloadRuntime {
  readonly createObjectUrl: (blob: Blob) => string;
  readonly revokeObjectUrl: (url: string) => void;
  readonly createAnchor: () => CubeDownloadAnchor;
  readonly scheduleCleanup: (callback: () => void, delayMs: number) => void;
}

export interface CubeDownloadRequestResult {
  readonly filename: string;
  readonly byteLength: number;
  readonly cubeHash: string;
  readonly requested: true;
}

const isSupportedLutSize = (value: number): value is 17 | 33 | 65 => {
  return value === 17 || value === 33 || value === 65;
};

export const buildCubeDownloadArtifact = async (
  prepared: PostLutPreparedData
): Promise<CubeDownloadArtifact> => {
  try {
    const text = prepared.cubeResult.content;
    const validation = validateCubeLut(text);
    const parsed = parseCubeLut(text);
    const sha256 = await createCubeContentHash(text);
    const lutSize = prepared.cubeResult.lutSize;

    if (!isSupportedLutSize(lutSize)) {
      throw new Error(`不支持的 LUT 点数：${lutSize}`);
    }

    if (!validation.isValid || validation.dataLineCount !== lutSize ** 3) {
      throw new Error(`Cube 基础格式校验失败：${validation.errors.join(" ")}`);
    }

    if (parsed.lut.data.length !== prepared.diagnostics.dataLineCount) {
      throw new Error("Cube parser 数据行数与准备结果不一致。");
    }

    if (!prepared.diagnostics.passed) {
      throw new Error("Cube 未通过 Preview / Export 一致性校验。");
    }

    if (sha256 !== prepared.cubeHash || prepared.cubeResult.cubeHash !== prepared.cubeHash) {
      throw new Error("Cube 内容 Hash 与当前 preparedPostLut 不一致。");
    }

    if (prepared.cubeResult.parameterHash !== prepared.parameterHash) {
      throw new Error("Cube 参数 Hash 与当前 preparedPostLut 不一致。");
    }

    const byteLength = new TextEncoder().encode(text).byteLength;
    const blob = new Blob([text], { type: cubeMimeType });

    if (byteLength === 0 || blob.size !== byteLength) {
      throw new Error("Cube 下载 Artifact 为空或字节长度不一致。");
    }

    return {
      filename: prepared.cubeResult.fileName,
      text,
      blob,
      mimeType: cubeMimeType,
      byteLength,
      sha256,
      parameterHash: prepared.parameterHash,
      cubeHash: prepared.cubeHash,
      lutSize,
      inputContract: prepared.diagnostics.inputContract,
      outputContract: prepared.diagnostics.outputContract
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 Artifact 构建错误";
    throw new Error(`Cube 下载 Artifact 构建失败：${message}`);
  }
};

const createBrowserDownloadRuntime = (): CubeDownloadRuntime => ({
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  createAnchor: () => {
    const anchor = document.createElement("a");
    return {
      get href() {
        return anchor.href;
      },
      set href(value: string) {
        anchor.href = value;
      },
      get download() {
        return anchor.download;
      },
      set download(value: string) {
        anchor.download = value;
      },
      get rel() {
        return anchor.rel;
      },
      set rel(value: string) {
        anchor.rel = value;
      },
      style: anchor.style,
      appendToDocument: () => document.body.appendChild(anchor),
      click: () => anchor.click(),
      remove: () => anchor.remove()
    };
  },
  scheduleCleanup: (callback, delayMs) => {
    window.setTimeout(callback, delayMs);
  }
});

export const triggerCubeDownloadArtifact = (
  artifact: CubeDownloadArtifact,
  runtime: CubeDownloadRuntime = createBrowserDownloadRuntime()
): CubeDownloadRequestResult => {
  if (artifact.byteLength <= 0 || artifact.blob.size !== artifact.byteLength || artifact.text.length === 0) {
    throw new Error("无法下载空的 Cube Artifact。");
  }

  if (!artifact.filename.toLowerCase().endsWith(".cube")) {
    throw new Error("Cube 下载文件名必须以 .cube 结尾。");
  }

  let objectUrl: string | null = null;
  let anchor: CubeDownloadAnchor | null = null;

  try {
    objectUrl = runtime.createObjectUrl(artifact.blob);
    anchor = runtime.createAnchor();
    anchor.href = objectUrl;
    anchor.download = artifact.filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    anchor.appendToDocument();
    anchor.click();
    anchor.remove();
    anchor = null;

    const urlToRevoke = objectUrl;
    runtime.scheduleCleanup(() => runtime.revokeObjectUrl(urlToRevoke), objectUrlRevocationDelayMs);
    objectUrl = null;

    return {
      filename: artifact.filename,
      byteLength: artifact.byteLength,
      cubeHash: artifact.cubeHash,
      requested: true
    };
  } catch (error) {
    anchor?.remove();
    if (objectUrl !== null) {
      runtime.revokeObjectUrl(objectUrl);
    }
    const message = error instanceof Error ? error.message : "未知浏览器下载错误";
    throw new Error(`请求浏览器下载失败：${message}`);
  }
};
