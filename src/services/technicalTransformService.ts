import { getTechnicalTransformRegistryMatches } from "../data/technicalTransformRegistry";
import type {
  TechnicalTransformBinding,
  TechnicalTransformImportParams,
  TechnicalTransformImportResult,
  TechnicalTransformRegistryMatch,
  TechnicalTransformVerification
} from "../types";
import { parseCubeLut } from "../utils/cubeParser";
import { validateCubeLut } from "../utils/cubeValidate";

const maximumCubeFileSize = 100 * 1024 * 1024;

const calculateSha256 = async (content: ArrayBuffer): Promise<string> => {
  try {
    if (globalThis.crypto?.subtle === undefined) {
      throw new Error("当前浏览器不支持 SHA-256 文件校验");
    }

    const digest = await globalThis.crypto.subtle.digest("SHA-256", content);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知哈希计算错误";
    throw new Error(`技术 LUT 文件哈希计算失败：${message}`);
  }
};

const chooseRegistryMatch = (
  matches: readonly TechnicalTransformRegistryMatch[],
  parsedSize: number
): TechnicalTransformRegistryMatch | undefined => {
  return matches.find((match) => match.supportedCubeSizes === "unknown" || match.supportedCubeSizes.includes(parsedSize)) ?? matches[0];
};

const resolveVerification = (
  match: TechnicalTransformRegistryMatch | undefined,
  sha256: string,
  parsedSize: number
): TechnicalTransformVerification => {
  if (
    match === undefined ||
    !match.officialMetadataVerified ||
    match.expectedSha256 === undefined ||
    match.expectedSha256 !== sha256 ||
    (match.supportedCubeSizes !== "unknown" && !match.supportedCubeSizes.includes(parsedSize))
  ) {
    return "user-supplied-unverified";
  }

  return "verified-official";
};

export const importLocalTechnicalTransform = async (
  params: TechnicalTransformImportParams
): Promise<TechnicalTransformImportResult> => {
  try {
    if (!params.file.name.toLocaleLowerCase("en-US").endsWith(".cube")) {
      throw new Error("请选择 .cube 格式的 3D LUT 文件");
    }
    if (params.file.size <= 0) {
      throw new Error("技术 LUT 文件为空");
    }
    if (params.file.size > maximumCubeFileSize) {
      throw new Error("技术 LUT 文件超过 100MB，已停止本地解析");
    }

    const fileBuffer = await params.file.arrayBuffer();
    const content = new TextDecoder("utf-8", { fatal: false }).decode(fileBuffer);
    const basicValidation = validateCubeLut(content);
    if (!basicValidation.isValid) {
      throw new Error(`.cube 基础格式校验失败：${basicValidation.errors.join(" ")}`);
    }
    const parseResult = parseCubeLut(content);
    const sha256 = await calculateSha256(fileBuffer);
    const matches = getTechnicalTransformRegistryMatches(params.modelId, params.inputGamma, params.inputGamut);
    const registryMatch = chooseRegistryMatch(matches, parseResult.lut.size);
    const verification = resolveVerification(registryMatch, sha256, parseResult.lut.size);
    const warnings = [...basicValidation.warnings, ...parseResult.warnings];

    if (registryMatch === undefined) {
      warnings.push("当前品牌、机型、Gamma 与 Gamut 没有匹配的厂商技术 LUT 元数据；文件仅按用户本地导入处理。");
    } else if (registryMatch.supportedCubeSizes !== "unknown" && !registryMatch.supportedCubeSizes.includes(parseResult.lut.size)) {
      warnings.push(`文件为 ${parseResult.lut.size} 点，但登记资料中的点数为 ${registryMatch.supportedCubeSizes.join(" / ")}。`);
    }
    if (registryMatch?.expectedSha256 === undefined) {
      warnings.push("登记资料没有官方文件哈希，无法把本地文件升级为 verified-official。");
    } else if (registryMatch.expectedSha256 !== sha256) {
      warnings.push("本地文件 SHA-256 与登记哈希不一致，已保持 user-supplied-unverified。");
    }

    const binding: TechnicalTransformBinding = {
      fileName: params.file.name,
      fileSize: params.file.size,
      sha256,
      parsedLut: parseResult.lut,
      modelId: params.modelId,
      inputGamma: params.inputGamma,
      inputGamut: params.inputGamut,
      outputSpace: registryMatch?.outputSpace ?? "用户指定输出；尚未核验",
      verification,
      ...(registryMatch === undefined ? {} : { assetId: registryMatch.assetId, sourceTitle: registryMatch.title }),
      ...(registryMatch?.sourceId === undefined ? {} : { sourceId: registryMatch.sourceId }),
      importedAt: new Date().toISOString()
    };

    return { binding, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知技术 LUT 导入错误";
    throw new Error(message.startsWith("技术 LUT") || message.startsWith("请选择") || message.startsWith(".cube") ? message : `技术 LUT 导入失败：${message}`);
  }
};
