import type {
  ColorPreviewAdjustments,
  ColorPreviewResult,
  CubeDownloadArtifact,
  ExportCubeLutParams,
  GenerateLocalPreviewParams,
  LutStressTestReport,
  PostLutPreparedData,
  PostLutStressTestAsset
} from "../types";
import { analyzeImageUrl } from "../utils/colorAnalysis";
import { createConfirmedInterpretation, defaultSrgbInterpretation } from "../utils/colorSpace";
import { generateColorPreview, getAverageColorFromImageUrl, revokeColorPreviewUrl } from "../utils/colorPreview";
import { generateCubeLut } from "../utils/cubeExport";
import { buildCubeDownloadArtifact, triggerCubeDownloadArtifact } from "../utils/cubeDownload";
import { parseCubeLut } from "../utils/cubeParser";
import { validateCubeLut } from "../utils/cubeValidate";
import { calculateCubeConsistency, createCubeContentHash, createInputInterpretationHash, createLutStressTestReport, createPostParameterHash } from "../utils/lutConsistency";

const toAdjustments = (params: {
  readonly parameters: ExportCubeLutParams["parameters"];
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
}): ColorPreviewAdjustments => ({
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
});

export interface PreparePostLutParams extends ExportCubeLutParams {
  readonly referenceColorInterpretation: GenerateLocalPreviewParams["referenceColorInterpretation"];
}

export const preparePostLut = async (params: PreparePostLutParams): Promise<PostLutPreparedData> => {
  try {
    const adjustments = toAdjustments(params);
    const targetColorInterpretation = params.targetColorInterpretation
      ?? createConfirmedInterpretation(
        params.sourceInputProfileId ?? "bt709-g24-full",
        "未提供素材解释时，按 POST LUT 的 BT.709 Gamma 2.4 Full 输入契约生成导出元数据。"
      );
    const referenceAverageColor = params.referenceAverageColor ?? (
      params.referenceImageUrl === undefined
        ? undefined
        : await getAverageColorFromImageUrl(params.referenceImageUrl, 480, params.referenceColorInterpretation)
    );
    const parameterHash = await createPostParameterHash({
      adjustments,
      lutSize: params.lutSize,
      ...(referenceAverageColor === undefined ? {} : { referenceAverageColor })
    });
    const inputInterpretationHash = await createInputInterpretationHash(targetColorInterpretation);
    const generated = generateCubeLut({
      lutName: params.lutName,
      lookName: params.lookName,
      lutSize: params.lutSize,
      adjustments,
      ...(referenceAverageColor === undefined ? {} : { referenceAverageColor }),
      ...(params.inputColorConfig === undefined ? {} : { inputColorConfig: params.inputColorConfig }),
      parameterHash,
      sourceInputProfileId: targetColorInterpretation.profileId,
      inputInterpretationHash
    });
    const validation = validateCubeLut(generated.content);

    if (!validation.isValid) {
      throw new Error(`LUT 文件校验失败：${validation.errors.join(" ")}`);
    }

    const parsed = parseCubeLut(generated.content);
    const cubeHash = await createCubeContentHash(generated.content);
    const diagnostics = calculateCubeConsistency(
      parsed.lut,
      adjustments,
      parameterHash,
      cubeHash,
      referenceAverageColor,
      inputInterpretationHash,
      targetColorInterpretation.profileId
    );

    if (!diagnostics.passed) {
      throw new Error(
        `LUT 回读一致性失败：平均误差 ${diagnostics.averageRgbError.toFixed(6)}，最大误差 ${diagnostics.maximumRgbError.toFixed(6)}。`
      );
    }

    const cubeResult = {
      ...generated,
      outputColorSpace: "Rec.709 / Gamma 2.4",
      dataLineCount: validation.dataLineCount,
      isValid: true,
      validationErrors: validation.errors,
      validationWarnings: [...validation.warnings, ...parsed.warnings],
      parameterHash,
      cubeHash,
      inputInterpretationHash,
      consistencyDiagnostics: diagnostics
    };

    return {
      cubeResult,
      parameterHash,
      cubeHash,
      inputInterpretationHash,
      diagnostics,
      ...(referenceAverageColor === undefined ? {} : { referenceAverageColor })
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 POST LUT 准备错误";
    throw new Error(`POST LUT 生成失败：${message}`);
  }
};

export const renderPreparedPostLut = async (
  params: GenerateLocalPreviewParams,
  prepared: PostLutPreparedData
): Promise<ColorPreviewResult> => {
  try {
    const validation = validateCubeLut(prepared.cubeResult.content);
    if (!validation.isValid) {
      throw new Error(`最终 Cube 校验失败：${validation.errors.join(" ")}`);
    }

    const parsed = parseCubeLut(prepared.cubeResult.content);
    return await generateColorPreview({
      targetImageUrl: params.targetImageUrl,
      parsedLut: parsed.lut,
      targetColorInterpretation: params.targetColorInterpretation,
      ...(params.technicalTransform === undefined ? {} : { technicalTransform: params.technicalTransform }),
      maxSize: 1600
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知最终 Cube 渲染错误";
    throw new Error(`最终 Cube 预览失败：${message}`);
  }
};

export const runPreparedPostLutStressTest = async (
  prepared: PostLutPreparedData,
  assets: readonly PostLutStressTestAsset[]
): Promise<LutStressTestReport> => {
  const requiredSceneIds = new Set<PostLutStressTestAsset["scene"]["id"]>([
    "portrait-normal",
    "portrait-close",
    "blue-sky",
    "blue-sky-greenery",
    "daylight-high-contrast",
    "saturated-red"
  ]);
  const providedSceneIds = new Set(assets.map((asset) => asset.scene.id));

  if (assets.length !== requiredSceneIds.size || [...requiredSceneIds].some((sceneId) => !providedSceneIds.has(sceneId))) {
    throw new Error("六场景压力测试必须为每个规定场景提供且只提供一份素材。 ");
  }

  try {
    const validation = validateCubeLut(prepared.cubeResult.content);
    if (!validation.isValid) {
      throw new Error(`压力测试 Cube 校验失败：${validation.errors.join(" ")}`);
    }

    const parsed = parseCubeLut(prepared.cubeResult.content);
    const entries = [];

    for (const asset of assets) {
      let rendered: ColorPreviewResult | null = null;

      try {
        rendered = await generateColorPreview({
          targetImageUrl: asset.imageUrl,
          parsedLut: parsed.lut,
          targetColorInterpretation: asset.colorInterpretation,
          ...(asset.technicalTransform === undefined ? {} : { technicalTransform: asset.technicalTransform }),
          maxSize: 960
        });
        const displayInterpretation = defaultSrgbInterpretation();
        const [before, after] = await Promise.all([
          analyzeImageUrl(rendered.sourcePreviewUrl, displayInterpretation),
          analyzeImageUrl(rendered.previewUrl, displayInterpretation)
        ]);
        entries.push({ scene: asset.scene, before, after });
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知场景渲染错误";
        throw new Error(`${asset.scene.label} 压力测试失败：${message}`);
      } finally {
        revokeColorPreviewUrl(rendered?.sourcePreviewUrl);
        revokeColorPreviewUrl(rendered?.previewUrl);
      }
    }

    return createLutStressTestReport(prepared.cubeHash, entries);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知六场景压力测试错误";
    throw new Error(`POST LUT 六场景压力测试失败：${message}`);
  }
};

export const createPreparedPostLutDownloadArtifact = async (
  prepared: PostLutPreparedData
): Promise<CubeDownloadArtifact> => {
  try {
    return await buildCubeDownloadArtifact(prepared);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 Artifact 准备错误";
    throw new Error(`POST LUT 下载 Artifact 已阻止：${message}`);
  }
};

export const requestPostLutDownload = (artifact: CubeDownloadArtifact): void => {
  triggerCubeDownloadArtifact(artifact);
};

export const downloadPreparedPostLut = async (
  prepared: PostLutPreparedData
): Promise<CubeDownloadArtifact> => {
  const artifact = await createPreparedPostLutDownloadArtifact(prepared);
  requestPostLutDownload(artifact);
  return artifact;
};

export const createColorPreviewAdjustments = toAdjustments;
