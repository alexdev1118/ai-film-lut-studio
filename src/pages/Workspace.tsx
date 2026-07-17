import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronUp, FlaskConical, HelpCircle, Info, Maximize, Sparkles, Upload, ZoomIn } from "lucide-react";
import { cameraBrandOptions, defaultCameraProfile, getCameraProfileById, getProfilesByBrand, toInputColorConfig } from "../data/cameraProfiles";
import { getColorEncodingProfile, getProfilesForContainer } from "../data/colorEncodingProfiles";
import { getValidationScene } from "../data/validationScenes";
import { demoTargetImage } from "../data/demoProject";
import { lutStyles } from "../data/styles";
import { exportCameraMonitoringLut, generateLocalColorPreview } from "../services/lutService";
import { createPreparedPostLutDownloadArtifact, requestPostLutDownload } from "../services/lutRenderService";
import { revokeWorkspacePreviewResult, useWorkspaceState } from "../state/WorkspaceContext";
import type { AnalysisParameterSnapshot, AutoColorAnalysisResult, AutoColorSuggestion, CameraBrand, CameraLutCubeSize, CameraLutRange, CameraLutSupportProfile, CameraLutUseType, CameraMonitoringExposureConfig, CapturedFrame, ColorContainer, ColorEncodingProfileId, ColorPreviewAdjustments, CubeDownloadStatus, ImageColorInterpretation, LutParameters, LutPrecision, LutValidationSceneId, MediaItem, PreviewResult, RoutePath, TechnicalTransformBinding, WorkspaceMediaState } from "../types";
import { analyzeImageUrl } from "../utils/colorAnalysis";
import { defaultDpxInterpretation, defaultSrgbInterpretation } from "../utils/colorSpace";
import { formatFileSize, getImageMetadata, getImageSourceFromCssBackground, getReadableImageType, revokeMediaItem, toUploadedMediaItem } from "../utils/image";
import { applyAutoColorSuggestion, createAnalysisParameterSnapshot, createAutoColorAnalysis, createAutoColorSuggestion, restoreAnalysisParameterSnapshot } from "../utils/lutValidation";
import { defaultLutParameters } from "../utils/lutMock";
import { capturedFrameToMediaItem } from "../utils/videoFrame";
import { decodeDpxFileToPreview, dpxPreviewToMediaItem, isDpxFile } from "../utils/dpx/dpxPreview";
import { DpxDecodeError, type DpxDecodeProgress } from "../utils/dpx/dpxTypes";
import { generateLutFileName, generatePostLutName, sanitizeLookName, suggestLookName } from "../utils/lutNaming";
import { createPostConfigurationSignature } from "../utils/lutConsistency";
import { LatestRequestGate } from "../utils/latestRequestGate";
import { applyLutStyleToWorkspace } from "../utils/styleSelection";
import { BeforeAfterPreview } from "../components/lut/BeforeAfterPreview";
import { AutoColorAnalysisPanel } from "../components/lut/AutoColorAnalysisPanel";
import { CameraLutExportModal } from "../components/lut/CameraLutExportModal";
import { CustomLutNameModal } from "../components/lut/CustomLutNameModal";
import { DaVinciRoundTripModal } from "../components/lut/DaVinciRoundTripModal";
import { LutUsageGuideModal } from "../components/lut/LutUsageGuideModal";
import { MediaBin } from "../components/lut/MediaBin";
import { PostLutExportSettings } from "../components/lut/PostLutExportSettings";
import { PreviewLightbox } from "../components/lut/PreviewLightbox";
import { QuickWorkflowPanel } from "../components/lut/QuickWorkflowPanel";
import { VideoFrameCaptureModal } from "../components/lut/VideoFrameCaptureModal";
import { Button } from "../components/ui/Button";
import { SelectControl } from "../components/ui/SelectControl";
import { SliderControl } from "../components/ui/SliderControl";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { UploadPanel } from "../components/ui/UploadPanel";
import type { LutStyleStrength } from "../types/lutStyles";
import { resolvePostExportGuard, resolveQuickIntensity } from "../utils/productWorkflow";

interface WorkspaceProps {
  readonly selectedStyleName: string;
  readonly selectedStyleStrength?: LutStyleStrength;
  readonly onNavigate: (path: RoutePath) => void;
}

const acceptedImageTypes = "image/jpeg,image/png,image/webp,image/tiff,image/x-dpx,.jpg,.jpeg,.png,.webp,.tif,.tiff,.dpx";
const defaultTargetName = "target-frame-rec709.jpg";
const inputColorConfigStorageKey = "ai-film-lut-studio-input-color-config";
const autoPreviewDebounceMs = 400;
const cubeDownloadStatusLabels: Record<CubeDownloadStatus, string> = {
  idle: "等待生成 LUT",
  preparing: "正在准备 LUT",
  generated: "LUT 已生成",
  requested: "已请求浏览器下载",
  blocked: "浏览器可能阻止了下载"
};
const defaultSrgbColorInterpretation = defaultSrgbInterpretation();
const getImageDimensionsLabel = (image: MediaItem): string => {
  if (typeof image.width === "number" && typeof image.height === "number") {
    return `${image.width}x${image.height}`;
  }

  return "读取中";
};

const getNextActiveId = (items: readonly MediaItem[], deletedIndex: number): string | undefined => {
  return items[deletedIndex]?.id ?? items[deletedIndex - 1]?.id ?? items[0]?.id;
};

const getLutSizeFromPrecision = (precision: LutPrecision): number => {
  switch (precision) {
    case "17x17x17":
      return 17;
    case "65x65x65":
      return 65;
    case "33x33x33":
    default:
      return 33;
  }
};

const getMediaColorContainer = (item: MediaItem | null): ColorContainer => {
  if (item?.originalFormat === "DPX" || item?.type === "image/x-dpx") {
    return "dpx";
  }
  if (item?.origin === "video-frame") {
    return "video-frame";
  }
  if (item?.type === "image/png") {
    return "png";
  }
  if (item?.type === "image/webp") {
    return "webp";
  }
  if (item?.type === "image/tiff") {
    return "tiff";
  }
  return "jpg";
};

const parseColorEncodingProfileId = (value: string): ColorEncodingProfileId => {
  return getColorEncodingProfile(value).id;
};

const resolveMediaColorInterpretation = (item: MediaItem | null): ImageColorInterpretation => {
  const interpretation = item?.colorInterpretation;

  if (interpretation !== undefined && typeof interpretation.profileId === "string") {
    return interpretation;
  }

  return item?.originalFormat === "DPX" ? defaultDpxInterpretation() : defaultSrgbInterpretation();
};

export const Workspace = ({ selectedStyleName, selectedStyleStrength, onNavigate }: WorkspaceProps) => {
  const {
    mediaState,
    setMediaState,
    targetImageError,
    setTargetImageError,
    referenceImageError,
    setReferenceImageError,
    parameters,
    setParameters,
    result,
    setResult,
    sessionPreviewResults,
    setSessionPreviewResults,
    message,
    setMessage,
    skinProtect,
    setSkinProtect,
    preserveLuma,
    setPreserveLuma,
    avoidOversaturation,
    setAvoidOversaturation,
    selectedBrandId,
    setSelectedBrandId,
    selectedProfileId,
    setSelectedProfileId,
    lutName,
    setLutName,
    postNamingMode,
    setPostNamingMode,
    postCustomFileName,
    setPostCustomFileName,
    selectedStyleKey,
    setSelectedStyleKey,
    experienceMode,
    setExperienceMode,
    quickWorkflowPreferences,
    setQuickWorkflowPreferences,
    lastExportResult,
    setLastExportResult,
    lastCubeDownloadArtifact,
    setLastCubeDownloadArtifact,
    cubeDownloadStatus,
    setCubeDownloadStatus,
    technicalTransform,
    setTechnicalTransform,
    lastAnalyzedTargetId,
    setLastAnalyzedTargetId
  } = useWorkspaceState();

  const selectedStyle = useMemo(() => {
    const styleKey = selectedStyleName.trim().length > 0 ? selectedStyleName.trim() : selectedStyleKey;

    if (styleKey.length === 0) {
      return lutStyles[0];
    }

    return lutStyles.find((style) => style.id === styleKey || style.name === styleKey) ?? lutStyles[0];
  }, [selectedStyleKey, selectedStyleName]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingCube, setIsExportingCube] = useState(false);
  const [isExportingCameraLut, setIsExportingCameraLut] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoFrameModalOpen, setIsVideoFrameModalOpen] = useState(false);
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const [isCameraLutModalOpen, setIsCameraLutModalOpen] = useState(false);
  const [isUsageGuideModalOpen, setIsUsageGuideModalOpen] = useState(false);
  const [isCustomLutNameModalOpen, setIsCustomLutNameModalOpen] = useState(false);
  const [isRoundTripModalOpen, setIsRoundTripModalOpen] = useState(false);
  const [dpxImportingSource, setDpxImportingSource] = useState<"target" | "reference" | null>(null);
  const [targetDpxStatus, setTargetDpxStatus] = useState("");
  const [referenceDpxStatus, setReferenceDpxStatus] = useState("");
  const [isAdvancedControlsOpen, setIsAdvancedControlsOpen] = useState(false);
  const [analysisSceneId, setAnalysisSceneId] = useState<LutValidationSceneId>("portrait-normal");
  const [isAnalyzingColor, setIsAnalyzingColor] = useState(false);
  const [autoColorAnalysis, setAutoColorAnalysis] = useState<AutoColorAnalysisResult | null>(null);
  const [autoColorSuggestion, setAutoColorSuggestion] = useState<AutoColorSuggestion | null>(null);
  const [analysisParameterSnapshot, setAnalysisParameterSnapshot] = useState<AnalysisParameterSnapshot | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const mediaStateRef = useRef<WorkspaceMediaState>(mediaState);
  const previewRequestGateRef = useRef(new LatestRequestGate());
  const autoPreviewTimerRef = useRef<number | undefined>(undefined);
  const dpxImportActiveRef = useRef(false);

  const activeTarget = useMemo(
    () => mediaState.targetItems.find((item) => item.id === mediaState.activeTargetId) ?? null,
    [mediaState.activeTargetId, mediaState.targetItems]
  );
  const activeReference = useMemo(
    () => mediaState.referenceItems.find((item) => item.id === mediaState.activeReferenceId) ?? null,
    [mediaState.activeReferenceId, mediaState.referenceItems]
  );
  const brandProfiles = useMemo(() => getProfilesByBrand(selectedBrandId), [selectedBrandId]);
  const selectedCameraProfile = useMemo(() => getCameraProfileById(selectedProfileId), [selectedProfileId]);
  const inputColorConfig = useMemo(() => toInputColorConfig(selectedCameraProfile), [selectedCameraProfile]);
  const activeStyleName = activeReference === null ? selectedStyle.name : "自定义参考图";
  const sourceImageUrl = activeTarget?.url ?? demoTargetImage.url;
  const canvasTargetImageUrl = activeTarget?.url ?? demoTargetImage.url;
  const referencePreviewUrl = activeReference?.url ?? getImageSourceFromCssBackground(selectedStyle.previewImage);
  const targetColorInterpretation = resolveMediaColorInterpretation(activeTarget);
  const referenceColorInterpretation = resolveMediaColorInterpretation(activeReference);
  const targetEncodingProfile = getColorEncodingProfile(targetColorInterpretation.profileId);
  const referenceEncodingProfile = getColorEncodingProfile(referenceColorInterpretation.profileId);
  const targetProfileOptions = useMemo(() => getProfilesForContainer(getMediaColorContainer(activeTarget)), [activeTarget]);
  const referenceProfileOptions = useMemo(() => getProfilesForContainer(getMediaColorContainer(activeReference)), [activeReference]);
  const targetMaterialKey = activeTarget?.id ?? "default-target";
  const referenceMaterialKey = activeReference?.id ?? `style-${selectedStyle.id}`;
  const beforeImageUrl = result?.sourcePreviewImage ?? sourceImageUrl;
  const afterImageUrl = result?.previewImage;
  const hasPreviewHistory = result !== null || sessionPreviewResults.length > 0;
  const targetAnalysisIsCurrent = lastAnalyzedTargetId === targetMaterialKey;
  const lookName = sanitizeLookName(lutName);
  const autoPostLutName = useMemo(
    () =>
      generatePostLutName({
        lookName,
        lutSize: getLutSizeFromPrecision(parameters.precision),
        namingMode: postNamingMode,
        inputColorConfig
      }),
    [inputColorConfig, lookName, parameters.precision, postNamingMode]
  );
  const resolvedPostLutName = postCustomFileName.trim().length > 0 ? sanitizeLookName(postCustomFileName) : autoPostLutName;
  const postLutFileName = generateLutFileName(resolvedPostLutName);
  const previewAdjustments = useMemo<ColorPreviewAdjustments>(() => ({
    intensity: parameters.intensity,
    contrast: parameters.contrast,
    saturation: parameters.saturation,
    temperature: parameters.temperature,
    tint: parameters.tint,
    shadowMatch: parameters.shadowMatch,
    midtoneMatch: parameters.midtoneMatch,
    highlightMatch: parameters.highlightMatch,
    skinToneProtection: skinProtect,
    preserveLuma,
    preventOversaturation: avoidOversaturation
  }), [avoidOversaturation, parameters, preserveLuma, skinProtect]);
  const postConfigurationSignature = useMemo(
    () => createPostConfigurationSignature({
      adjustments: previewAdjustments,
      lutSize: getLutSizeFromPrecision(parameters.precision),
      lutName: resolvedPostLutName,
      lookName,
      inputColorConfig,
      referenceKey: referenceMaterialKey,
      targetKey: targetMaterialKey,
      technicalTransformKey: technicalTransform?.sha256 ?? "none",
      targetInterpretation: targetColorInterpretation,
      referenceInterpretation: referenceColorInterpretation
    }),
    [inputColorConfig, lookName, parameters.precision, previewAdjustments, referenceColorInterpretation, referenceMaterialKey, resolvedPostLutName, targetColorInterpretation, targetMaterialKey, technicalTransform?.sha256]
  );
  const currentPreparedPostLut = result?.configurationSignature === postConfigurationSignature ? result.preparedPostLut : undefined;
  const quickPostExportGuard = resolvePostExportGuard({
    footageAppearance: quickWorkflowPreferences.footageAppearance,
    hasVerifiedTechnicalTransform: technicalTransform?.verification === "verified-official",
    currentPixelsConfirmedRec709: quickWorkflowPreferences.footageAppearance === "normal-color"
  });

  useEffect(() => {
    if (brandProfiles.length > 0 && !brandProfiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(brandProfiles[0].id);
    }
  }, [brandProfiles, selectedProfileId, setSelectedProfileId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(inputColorConfigStorageKey, JSON.stringify(inputColorConfig));
    } catch (error) {
      console.warn("保存输入素材配置失败", error);
    }
  }, [inputColorConfig]);

  useEffect(() => {
    mediaStateRef.current = mediaState;
  }, [mediaState]);

  useEffect(() => {
    if (selectedStyle.id === selectedStyleKey && selectedStyleStrength === undefined) {
      return;
    }

    const styleApplication = applyLutStyleToWorkspace(selectedStyle, selectedStyleStrength);
    setSelectedStyleKey(styleApplication.styleId);
    setParameters((current) => ({ ...current, ...styleApplication.parameters }));
    setSkinProtect(styleApplication.skinToneProtection);
    setPreserveLuma(styleApplication.preserveLuma);
    setAvoidOversaturation(styleApplication.preventOversaturation);

    if (mediaStateRef.current.activeReferenceId === undefined) {
      setLutName(suggestLookName(styleApplication.styleName));
      setMessage(`已应用风格：${styleApplication.styleName}，强度 ${styleApplication.parameters.intensity}%`);
    }
  }, [
    selectedStyle,
    selectedStyleStrength,
    selectedStyleKey,
    setAvoidOversaturation,
    setLutName,
    setMessage,
    setParameters,
    setPreserveLuma,
    setSelectedStyleKey,
    setSkinProtect
  ]);

  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging || splitContainerRef.current === null) {
        return;
      }

      const clientX = "touches" in event ? event.touches[0]?.clientX : event.clientX;

      if (typeof clientX !== "number") {
        return;
      }

      const rect = splitContainerRef.current.getBoundingClientRect();
      const nextPosition = ((clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.min(Math.max(nextPosition, 0), 100));
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      if (autoPreviewTimerRef.current !== undefined) {
        window.clearTimeout(autoPreviewTimerRef.current);
      }
    };
  }, []);

  const clearCanvasPreview = () => {
    setResult((current) => {
      revokeWorkspacePreviewResult(current);
      return null;
    });
  };

  const clearAutoColorAnalysis = () => {
    setAutoColorAnalysis(null);
    setAutoColorSuggestion(null);
    setAnalysisParameterSnapshot(null);
    setLastAnalyzedTargetId(null);
  };

  const handleRunAutoColorAnalysis = async () => {
    if (isAnalyzingColor) {
      return;
    }

    try {
      setIsAnalyzingColor(true);
      setMessage("正在分析目标图与参考图的本地像素统计...");
      const [targetStatistics, referenceStatistics] = await Promise.all([
        analyzeImageUrl(canvasTargetImageUrl, targetColorInterpretation),
        analyzeImageUrl(referencePreviewUrl, referenceColorInterpretation)
      ]);
      const scene = getValidationScene(analysisSceneId);
      const analysis = createAutoColorAnalysis(targetStatistics, referenceStatistics, {
        inputColorConfig,
        ...(technicalTransform === null ? {} : { technicalTransform }),
        ...(scene === undefined ? {} : { scene })
      });
      const suggestion = createAutoColorSuggestion(parameters, analysis, scene);

      setAutoColorAnalysis(analysis);
      setAutoColorSuggestion(suggestion);
      setAnalysisParameterSnapshot(null);
      setMessage(analysis.readiness === "ready" ? "自动分析完成，建议尚未应用" : "自动分析完成，当前结果为实验性或未确认预览");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "本地自动色彩分析失败，请更换可预览图片后重试";
      setMessage(errorMessage);
    } finally {
      setIsAnalyzingColor(false);
    }
  };

  const handleApplyAutoColorSuggestion = () => {
    if (autoColorSuggestion === null) {
      return;
    }

    setAnalysisParameterSnapshot(createAnalysisParameterSnapshot(parameters, skinProtect, preserveLuma, avoidOversaturation));
    setParameters((current) => applyAutoColorSuggestion(current, autoColorSuggestion));
    setSkinProtect(autoColorSuggestion.skinToneProtection);
    setPreserveLuma(autoColorSuggestion.preserveLuma);
    setAvoidOversaturation(autoColorSuggestion.preventOversaturation);
    setLastAnalyzedTargetId(targetMaterialKey);
    setMessage("已应用本地自动分析建议；仍可继续手动微调或恢复分析前参数");
  };

  const handleRestoreAnalysisParameters = () => {
    if (analysisParameterSnapshot === null) {
      return;
    }

    const restored = restoreAnalysisParameterSnapshot(analysisParameterSnapshot);
    setParameters(restored.parameters);
    setSkinProtect(restored.skinToneProtection);
    setPreserveLuma(restored.preserveLuma);
    setAvoidOversaturation(restored.preventOversaturation);
    setAnalysisParameterSnapshot(null);
    setLastAnalyzedTargetId(null);
    setMessage("已恢复自动分析前的参数");
  };

  const runPreviewGeneration = async (mode: "manual" | "auto"): Promise<PreviewResult | null> => {
    const requestId = previewRequestGateRef.current.begin();

    try {
      setIsGenerating(true);
      setMessage(mode === "auto" ? "正在更新预览..." : "AI 正在分析参考图色彩、影调与对比度...");
      const previewResult = await generateLocalColorPreview({
        targetImageUrl: canvasTargetImageUrl,
        ...(activeReference === null ? {} : { referenceImageUrl: activeReference.url }),
        selectedStyleName: activeStyleName,
        parameters,
        skinToneProtection: skinProtect,
        preserveLuma,
        preventOversaturation: avoidOversaturation,
        ...(technicalTransform === null ? {} : { technicalTransform }),
        targetColorInterpretation,
        referenceColorInterpretation,
        targetMaterialName: activeTarget?.name ?? defaultTargetName,
        referenceMaterialName: activeReference?.name ?? selectedStyle.name,
        configurationSignature: postConfigurationSignature,
        lutName: resolvedPostLutName,
        lookName,
        lutSize: getLutSizeFromPrecision(parameters.precision),
        inputColorConfig
      });

      if (!previewRequestGateRef.current.isCurrent(requestId)) {
        revokeWorkspacePreviewResult(previewResult);
        return null;
      }

      setCubeDownloadStatus("preparing");
      const downloadArtifact = previewResult.preparedPostLut === undefined
        ? null
        : await createPreparedPostLutDownloadArtifact(previewResult.preparedPostLut);

      if (!previewRequestGateRef.current.isCurrent(requestId)) {
        revokeWorkspacePreviewResult(previewResult);
        return null;
      }

      setResult((current) => {
        revokeWorkspacePreviewResult(current);
        return previewResult;
      });
      setLastCubeDownloadArtifact(downloadArtifact);
      setCubeDownloadStatus(downloadArtifact === null ? "idle" : "generated");
      const sessionRecord: PreviewResult = {
        id: previewResult.id,
        status: previewResult.status,
        styleName: previewResult.styleName,
        previewImage: "",
        generatedAt: previewResult.generatedAt,
        width: previewResult.width,
        height: previewResult.height,
        isCanvasPreview: false,
        inputReliability: previewResult.inputReliability
      };
      setSessionPreviewResults((current) => [sessionRecord, ...current].slice(0, 20));
      setMessage(
        previewResult.inputReliability === "reliable"
          ? mode === "auto" ? "最终 Cube 预览已更新" : "最终 Cube 预览已生成"
          : "最终 Cube 已渲染，但当前输入 Gamma / Range 未确认，预览可靠性有限"
      );
      return previewResult;
    } catch (error) {
      if (!previewRequestGateRef.current.isCurrent(requestId)) {
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : "预览生成失败，请更换图片或降低图片尺寸";
      setCubeDownloadStatus("blocked");
      setMessage(errorMessage);
      return null;
    } finally {
      if (previewRequestGateRef.current.isCurrent(requestId)) {
        setIsGenerating(false);
      }
    }
  };

  useEffect(() => {
    if (!hasPreviewHistory) {
      return undefined;
    }

    if (autoPreviewTimerRef.current !== undefined) {
      window.clearTimeout(autoPreviewTimerRef.current);
    }

    autoPreviewTimerRef.current = window.setTimeout(() => {
      void runPreviewGeneration("auto");
    }, autoPreviewDebounceMs);

    return () => {
      if (autoPreviewTimerRef.current !== undefined) {
        window.clearTimeout(autoPreviewTimerRef.current);
      }
    };
  }, [
    activeReference?.url,
    activeStyleName,
    hasPreviewHistory,
    parameters,
    preserveLuma,
    avoidOversaturation,
    skinProtect,
    canvasTargetImageUrl,
    technicalTransform,
    postConfigurationSignature
  ]);

  const updateDpxStatus = (sourceType: "target" | "reference", progress: DpxDecodeProgress): void => {
    if (sourceType === "target") {
      setTargetDpxStatus(progress.message);
      return;
    }

    setReferenceDpxStatus(progress.message);
  };

  const decodeDpxMediaItem = async (file: File, sourceType: "target" | "reference"): Promise<MediaItem> => {
    if (dpxImportActiveRef.current) {
      throw new Error("已有 DPX 正在本地解析，请等待当前文件处理完成后再选择下一张。 ");
    }

    dpxImportActiveRef.current = true;
    setDpxImportingSource(sourceType);
    updateDpxStatus(sourceType, { phase: "reading", message: "正在读取本地 DPX 文件..." });

    try {
      const preview = await decodeDpxFileToPreview(file, (progress) => updateDpxStatus(sourceType, progress));
      return dpxPreviewToMediaItem(file, sourceType, preview);
    } finally {
      dpxImportActiveRef.current = false;
      setDpxImportingSource(null);
    }
  };

  const getDpxErrorMessage = (error: unknown): string => {
    if (error instanceof DpxDecodeError) {
      return `${error.message} ${error.support.suggestion}`;
    }

    return error instanceof Error ? error.message : "DPX 读取失败，请在 DaVinci Resolve 中改为导出 PNG、TIFF 或兼容的无压缩 RGB DPX。";
  };

  const handleTargetImageFileChange = async (file: File) => {
    try {
      setTargetImageError("");
      setTargetDpxStatus("");
      const mediaItem = isDpxFile(file)
        ? await decodeDpxMediaItem(file, "target")
        : toUploadedMediaItem(file, await getImageMetadata(file), "target");
      setMediaState((current) => ({
        ...current,
        targetItems: [mediaItem, ...current.targetItems],
        activeTargetId: mediaItem.id
      }));
      clearCanvasPreview();
      clearAutoColorAnalysis();
      if (mediaItem.originalFormat === "DPX") {
        setTargetDpxStatus(`${mediaItem.sourceBitDepth}-bit ${mediaItem.sourceDescriptor === 51 ? "RGBA" : "RGB"} DPX 已生成本地预览，未应用 Log 技术转换。`);
      }
      setMessage(hasPreviewHistory ? "目标素材已更换，当前参数尚未针对新素材重新分析。" : "目标素材已加入素材箱");
    } catch (error) {
      const errorMessage = isDpxFile(file) ? getDpxErrorMessage(error) : error instanceof Error ? error.message : "图片读取失败，请更换图片";
      setTargetImageError(errorMessage);
    }
  };

  const handleReferenceImageFileChange = async (file: File) => {
    try {
      setReferenceImageError("");
      setReferenceDpxStatus("");
      const mediaItem = isDpxFile(file)
        ? await decodeDpxMediaItem(file, "reference")
        : toUploadedMediaItem(file, await getImageMetadata(file), "reference");
      setMediaState((current) => ({
        ...current,
        referenceItems: [mediaItem, ...current.referenceItems],
        activeReferenceId: mediaItem.id
      }));
      clearCanvasPreview();
      clearAutoColorAnalysis();
      if (mediaItem.originalFormat === "DPX") {
        setReferenceDpxStatus(`${mediaItem.sourceBitDepth}-bit ${mediaItem.sourceDescriptor === 51 ? "RGBA" : "RGB"} DPX 已生成本地预览，未应用 Log 技术转换。`);
      }
      setLutName("CustomLook");
      setMessage(hasPreviewHistory ? "参考图已切换，预览将自动更新" : "已选择风格：自定义参考图");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "图片读取失败，请更换图片";
      setReferenceImageError(errorMessage);
    }
  };

  const handleCapturedFrame = (frame: CapturedFrame) => {
    try {
      const mediaItem = capturedFrameToMediaItem(frame);
      setTargetImageError("");
      setMediaState((current) => ({
        ...current,
        targetItems: [mediaItem, ...current.targetItems],
        activeTargetId: mediaItem.id
      }));
      clearCanvasPreview();
      clearAutoColorAnalysis();
      setMessage(hasPreviewHistory ? "目标素材已更换，当前参数尚未针对新素材重新分析。" : "视频帧已加入目标素材箱");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "当前帧截取失败，请调整时间点后重试";
      setTargetImageError(errorMessage);
    }
  };

  const handleSelectTarget = (itemId: string) => {
    setMediaState((current) => ({ ...current, activeTargetId: itemId }));
    clearCanvasPreview();
    clearAutoColorAnalysis();
    setMessage(hasPreviewHistory ? "目标素材已更换，当前参数尚未针对新素材重新分析。" : "已切换目标素材");
  };

  const handleSelectReference = (itemId: string) => {
    setMediaState((current) => ({ ...current, activeReferenceId: itemId }));
    clearCanvasPreview();
    clearAutoColorAnalysis();
    setLutName("CustomLook");
    setMessage(hasPreviewHistory ? "参考图已切换，预览将自动更新" : "已选择风格：自定义参考图");
  };

  const handleDeleteTarget = (itemId: string) => {
    const current = mediaStateRef.current;
    const deletedIndex = current.targetItems.findIndex((item) => item.id === itemId);
    const item = current.targetItems[deletedIndex];

    if (item === undefined) {
      return;
    }

    if (!window.confirm(`确定从目标素材箱删除“${item.name}”？`)) {
      return;
    }

    const nextItems = current.targetItems.filter((mediaItem) => mediaItem.id !== itemId);
    const isActiveDeleted = current.activeTargetId === itemId;
    revokeMediaItem(item);
    setMediaState({
      ...current,
      targetItems: nextItems,
      activeTargetId: isActiveDeleted ? getNextActiveId(nextItems, deletedIndex) : current.activeTargetId
    });

    if (isActiveDeleted) {
      clearCanvasPreview();
      clearAutoColorAnalysis();
      setMessage(nextItems.length === 0 ? "已回到默认目标图；当前参数尚未针对该素材重新分析。" : "目标素材已更换，当前参数尚未针对新素材重新分析。");
    }
  };

  const handleDeleteReference = (itemId: string) => {
    const current = mediaStateRef.current;
    const deletedIndex = current.referenceItems.findIndex((item) => item.id === itemId);
    const item = current.referenceItems[deletedIndex];

    if (item === undefined) {
      return;
    }

    if (!window.confirm(`确定从参考素材箱删除“${item.name}”？`)) {
      return;
    }

    const nextItems = current.referenceItems.filter((mediaItem) => mediaItem.id !== itemId);
    const isActiveDeleted = current.activeReferenceId === itemId;
    const nextActiveReferenceId = isActiveDeleted ? getNextActiveId(nextItems, deletedIndex) : current.activeReferenceId;
    revokeMediaItem(item);
    setMediaState({
      ...current,
      referenceItems: nextItems,
      activeReferenceId: nextActiveReferenceId
    });

    if (isActiveDeleted) {
      clearCanvasPreview();
      clearAutoColorAnalysis();

      if (nextActiveReferenceId === undefined) {
        setLutName(suggestLookName(selectedStyle.name));
        setMessage(`已选择风格：${selectedStyle.name}`);
      } else {
        setLutName("CustomLook");
        setMessage("已切换参考图");
      }
    }
  };

  const updateActiveTargetInterpretation = (nextInterpretation: ImageColorInterpretation): void => {
    const activeTargetId = mediaStateRef.current.activeTargetId;

    if (activeTargetId === undefined) {
      setMessage("当前没有可更新色彩解释的目标素材");
      return;
    }

    setMediaState((current) => ({
      ...current,
      targetItems: current.targetItems.map((item) =>
        item.id === activeTargetId ? { ...item, colorInterpretation: nextInterpretation } : item
      )
    }));
    clearCanvasPreview();
    clearAutoColorAnalysis();
    setMessage("目标素材输入 Profile 已更新，正在按新契约重建预览");
  };

  const updateActiveReferenceInterpretation = (nextInterpretation: ImageColorInterpretation): void => {
    const activeReferenceId = mediaStateRef.current.activeReferenceId;

    if (activeReferenceId === undefined) {
      setMessage("当前没有可更新色彩解释的参考素材");
      return;
    }

    setMediaState((current) => ({
      ...current,
      referenceItems: current.referenceItems.map((item) =>
        item.id === activeReferenceId ? { ...item, colorInterpretation: nextInterpretation } : item
      )
    }));
    clearCanvasPreview();
    clearAutoColorAnalysis();
    setMessage("参考素材输入 Profile 已更新，正在按新契约重建预览与参考色分析");
  };

  const handleGenerate = async () => {
    await runPreviewGeneration("manual");
  };

  const handleQuickWorkflowPreferencesChange = (nextPreferences: typeof quickWorkflowPreferences): void => {
    const nextIntensity = resolveQuickIntensity(nextPreferences.intensityPreset);
    setQuickWorkflowPreferences(nextPreferences);
    if (nextPreferences.footageAppearance !== quickWorkflowPreferences.footageAppearance) {
      if (nextPreferences.footageAppearance === "normal-color") {
        setSelectedBrandId("generic");
        setSelectedProfileId("generic-rec709");
        clearAutoColorAnalysis();
      } else if (nextPreferences.footageAppearance === "unknown") {
        setSelectedBrandId("generic");
        setSelectedProfileId("generic-unknown");
        clearAutoColorAnalysis();
      }
    }
    if (nextIntensity !== parameters.intensity) {
      setParameters((current) => ({ ...current, intensity: nextIntensity }));
    }
  };

  const handleOpenFullscreenPreview = async () => {
    try {
      const target = previewStageRef.current;

      if (target === null || target.requestFullscreen === undefined) {
        setMessage("当前浏览器不支持全屏预览。");
        setIsPreviewLightboxOpen(true);
        return;
      }

      await target.requestFullscreen();
      setMessage("已进入全屏预览，按 Esc 可退出。");
    } catch (error) {
      console.warn("进入全屏预览失败", error);
      if (document.fullscreenElement !== null) {
        setMessage("已进入全屏预览，按 Esc 可退出。");
        return;
      }

      setMessage("当前浏览器不支持全屏预览。");
      setIsPreviewLightboxOpen(true);
    }
  };

  const handleExportCube = async () => {
    if (isExportingCube) {
      return;
    }

    if (experienceMode === "quick" && !quickPostExportGuard.canExportPostLut) {
      setMessage(quickPostExportGuard.message);
      return;
    }

    try {
      setIsExportingCube(true);
      setCubeDownloadStatus("preparing");
      const previewResult = result?.configurationSignature === postConfigurationSignature
        ? result
        : await runPreviewGeneration("manual");
      const prepared = previewResult?.preparedPostLut;

      if (prepared === undefined) {
        throw new Error("当前预览没有可下载的最终 Cube，请先确认预览生成成功。 ");
      }

      const exportResult = {
        ...prepared.cubeResult,
        targetMaterialName: activeTarget?.name ?? defaultTargetName,
        referenceMaterialName: activeReference?.name ?? selectedStyle.name,
        targetWasReanalyzed: targetAnalysisIsCurrent
      };
      const exportPrepared = { ...prepared, cubeResult: exportResult };
      const matchesPreviousExport = lastExportResult?.cubeHash !== undefined && lastExportResult.cubeHash === exportResult.cubeHash;
      const artifact = lastCubeDownloadArtifact?.cubeHash === exportPrepared.cubeHash
        && lastCubeDownloadArtifact.parameterHash === exportPrepared.parameterHash
        ? lastCubeDownloadArtifact
        : await createPreparedPostLutDownloadArtifact(exportPrepared);

      requestPostLutDownload(artifact);
      setLastCubeDownloadArtifact(artifact);
      setCubeDownloadStatus("requested");
      setLastExportResult(exportResult);
      if (matchesPreviousExport) {
        setMessage("已请求浏览器重新下载同一份已验证 LUT；文件未出现时可点击重新下载");
      } else if (!targetAnalysisIsCurrent) {
        setMessage("LUT 已生成并请求浏览器下载；当前参数未针对新目标素材重新分析");
      } else {
        setMessage("LUT 已生成并通过校验，已请求浏览器下载");
      }
    } catch (error) {
      console.error("LUT 导出失败", error);
      const errorMessage = error instanceof Error ? error.message : "LUT 导出失败，请稍后重试";
      setCubeDownloadStatus("blocked");
      setMessage(errorMessage);
    } finally {
      setIsExportingCube(false);
    }
  };

  const handleRetryCubeDownload = () => {
    if (lastCubeDownloadArtifact === null) {
      setMessage("当前没有可重新下载的已验证 LUT，请先生成预览");
      return;
    }

    try {
      requestPostLutDownload(lastCubeDownloadArtifact);
      setCubeDownloadStatus("requested");
      setMessage("已再次请求浏览器下载；若仍未出现，请检查浏览器下载权限");
    } catch (error) {
      console.error("重新下载 LUT 失败", error);
      setCubeDownloadStatus("blocked");
      setMessage(error instanceof Error ? error.message : "重新下载失败，请稍后重试");
    }
  };

  const handleExportCameraMonitoringLut = async (value: {
    readonly lutName: string;
    readonly profile: CameraLutSupportProfile;
    readonly selectedLogProfile: string;
    readonly selectedGamut: string;
    readonly lutUseType: CameraLutUseType;
    readonly requestedCubeSize: CameraLutCubeSize | "auto";
    readonly range: CameraLutRange;
    readonly exposureConfig: CameraMonitoringExposureConfig;
    readonly technicalTransform?: TechnicalTransformBinding;
  }) => {
    if (isExportingCameraLut) {
      return;
    }

    try {
      setIsExportingCameraLut(true);
      const exportResult = await exportCameraMonitoringLut({
        lutName: value.lutName,
        profile: value.profile,
        requestedCubeSize: value.requestedCubeSize,
        selectedLogProfile: value.selectedLogProfile,
        selectedGamut: value.selectedGamut,
        lutUseType: value.lutUseType,
        range: value.range,
        exposureConfig: value.exposureConfig,
        parameters,
        skinToneProtection: skinProtect,
        preserveLuma,
        preventOversaturation: avoidOversaturation,
        referenceImageUrl: activeReference?.url,
        technicalTransform: value.technicalTransform
      });
      setLastExportResult(exportResult);
      setMessage(
        exportResult.dataStatus === "verified-official"
          ? "相机监看 LUT 已生成并通过基础格式校验"
          : "相机监看 LUT 已生成；该机型规格仍需官方确认，请先小范围测试"
      );
      setIsCameraLutModalOpen(false);
    } catch (error) {
      console.error("相机监看 LUT 导出失败", error);
      const errorMessage = error instanceof Error ? error.message : "相机监看 LUT 导出失败，请稍后重试";
      setMessage(errorMessage);
    } finally {
      setIsExportingCameraLut(false);
    }
  };

  const setNumberParameter = (
    key: keyof Pick<
      LutParameters,
      "intensity" | "contrast" | "saturation" | "temperature" | "tint" | "shadowMatch" | "midtoneMatch" | "highlightMatch"
    >,
    value: number
  ) => {
    if (autoColorSuggestion !== null || analysisParameterSnapshot !== null) {
      setAutoColorSuggestion(null);
      setAnalysisParameterSnapshot(null);
    }
    setParameters((current) => ({ ...current, [key]: value }));
  };

  const handleAdvancedToggleChange = (
    setter: (value: boolean) => void,
    value: boolean
  ): void => {
    if (autoColorSuggestion !== null || analysisParameterSnapshot !== null) {
      setAutoColorSuggestion(null);
      setAnalysisParameterSnapshot(null);
    }
    setter(value);
  };

  const resetParameters = () => {
    setParameters({ ...defaultLutParameters, intensity: 50, precision: parameters.precision });
    setSkinProtect(true);
    setPreserveLuma(true);
    setAvoidOversaturation(false);
    clearAutoColorAnalysis();
  };

  const aiStatus = isGenerating ? (hasPreviewHistory ? "正在更新预览..." : "AI 正在分析参考图色彩、影调与对比度...") : result === null ? "AI 就绪" : "预览已生成";
  const previewWidth = activeTarget?.width ?? 16;
  const previewHeight = activeTarget?.height ?? 9;

  return (
    <>
      <section className="studio-source-column glass-panel">
        <div className="panel-title-row">
          <h1>目标素材箱</h1>
          <Info aria-hidden="true" />
        </div>

        <div className="studio-source-stack">
          <div className="target-upload-actions">
            <UploadPanel
              accept={acceptedImageTypes}
              className="studio-upload-dropzone compact-upload-dropzone"
              description="JPG / PNG / WebP / TIFF / DPX"
              fileName={activeTarget?.name ?? ""}
              icon={<Upload aria-hidden="true" />}
              inputMode="file"
              isProcessing={dpxImportingSource !== null}
              processingStatus={targetDpxStatus}
              title="上传目标静帧"
              onFileChange={handleTargetImageFileChange}
            />
            <button className="video-frame-trigger" type="button" onClick={() => setIsVideoFrameModalOpen(true)}>
              视频抽帧
            </button>
          </div>
          {targetImageError.length > 0 ? <p className="upload-error">{targetImageError}</p> : null}

          <MediaBin
            activeItemId={mediaState.activeTargetId}
            emptyLabel="还没有上传目标图，当前使用默认 mock 静帧。"
            items={mediaState.targetItems}
            title="当前会话目标素材"
            onDelete={handleDeleteTarget}
            onSelect={handleSelectTarget}
          />

          {experienceMode === "professional" ? <section className="input-config-card">
            <div className="input-config-title">
              <span>输入素材配置</span>
              <small>{selectedCameraProfile.inputType.toUpperCase()}</small>
            </div>
            <SelectControl
              label="相机品牌"
              options={cameraBrandOptions.map((brand) => ({ value: brand.id, label: brand.label }))}
              value={selectedBrandId}
              onChange={(nextValue) => {
                const nextBrand = cameraBrandOptions.find((brand) => brand.id === nextValue);
                if (nextBrand === undefined) {
                  setMessage("无法识别所选相机品牌，请重新选择");
                  return;
                }
                const nextBrandId: CameraBrand = nextBrand.id;
                const nextProfiles = getProfilesByBrand(nextBrandId);
                setSelectedBrandId(nextBrandId);
                setSelectedProfileId(nextProfiles[0]?.id ?? defaultCameraProfile.id);
                clearAutoColorAnalysis();
              }}
            />
            <SelectControl
              label="曲线 / Picture Profile"
              options={brandProfiles.map((profile) => ({
                value: profile.id,
                label: profile.label,
                description: `${profile.gamma} / ${profile.gamut}`
              }))}
              value={selectedProfileId}
              onChange={(nextValue) => {
                setSelectedProfileId(nextValue);
                clearAutoColorAnalysis();
              }}
            />
            <div className="input-config-summary">
              <p>
                <span>Gamma</span>
                <strong>{selectedCameraProfile.gamma}</strong>
              </p>
              <p>
                <span>Gamut</span>
                <strong>{selectedCameraProfile.gamut}</strong>
              </p>
              <p>
                <span>直接套用</span>
                <strong>{selectedCameraProfile.canUseDirectly ? "可测试" : "建议先转换"}</strong>
              </p>
              <p>
                <span>目录状态</span>
                <strong>{selectedCameraProfile.dataStatus === "built-in" ? "内置目录" : "待确认"}</strong>
              </p>
            </div>
            {selectedCameraProfile.dataStatus === "built-in" ? null : (
              <p className="input-config-status-note">该配置为工作流占位，后续需要导入官方数据确认。</p>
            )}
            <p className={selectedCameraProfile.inputType === "log" ? "input-config-tip warning" : "input-config-tip"}>
              <Sparkles aria-hidden="true" />
              <span>{selectedCameraProfile.recommendedWorkflow}</span>
            </p>
            <p className="input-config-tip muted">{selectedCameraProfile.davinciTip}</p>
          </section> : (
            <section className={`quick-source-summary ${quickPostExportGuard.level}`}>
              <div><strong>素材状态</strong><span>{quickWorkflowPreferences.footageAppearance === "log-flat" ? "灰、低对比的 Log" : quickWorkflowPreferences.footageAppearance === "normal-color" ? "已经是正常颜色" : "不确定"}</span></div>
              <p>{quickPostExportGuard.message}</p>
              <button type="button" onClick={() => setExperienceMode("professional")}>需要精确设置相机 / Gamma / Gamut</button>
            </section>
          )}

          <div className="metadata-card">
            <p>
              <span>文件名</span>
              <strong>{activeTarget?.name ?? defaultTargetName}</strong>
            </p>
            <p>
              <span>分辨率</span>
              <strong>{activeTarget === null ? "3840x2160" : getImageDimensionsLabel(activeTarget)}</strong>
            </p>
            <p>
              <span>格式</span>
              <strong>{activeTarget?.type === undefined ? "JPG" : getReadableImageType(activeTarget.type)}</strong>
            </p>
            <p>
              <span>文件大小</span>
              <strong>{activeTarget?.size === undefined ? "2.8 MB" : formatFileSize(activeTarget.size)}</strong>
            </p>
            {activeTarget?.originalFormat === "DPX" ? (
              <>
                <p><span>位深</span><strong>{activeTarget.sourceBitDepth ?? "未知"}-bit</strong></p>
                <p><span>Descriptor</span><strong>{activeTarget.sourceDescriptor === 51 ? "RGBA (51)" : activeTarget.sourceDescriptor === 50 ? "RGB (50)" : activeTarget.sourceDescriptor ?? "未知"}</strong></p>
                <p><span>Packing / Encoding</span><strong>{activeTarget.sourcePacking ?? "未知"} / {activeTarget.sourceEncoding ?? "未知"}</strong></p>
                <p><span>Data Sign</span><strong>{activeTarget.sourceDataSign ?? "未知"}</strong></p>
                <p><span>字节序</span><strong>{activeTarget.endian === "big-endian" ? "大端" : activeTarget.endian === "little-endian" ? "小端" : "未知"}</strong></p>
                <p><span>Transfer</span><strong>{activeTarget.sourceTransfer ?? "未知"}</strong></p>
                <p><span>预览状态</span><strong>本地预览，未做技术转换</strong></p>
              </>
            ) : null}
            <div className="dpx-color-interpretation input-color-profile-panel">
              <SelectControl
                disabled={activeTarget === null}
                label="输入编码 Profile"
                options={targetProfileOptions.map((profile) => ({
                  value: profile.id,
                  label: profile.displayName,
                  description: profile.intendedUse
                }))}
                value={targetColorInterpretation.profileId}
                onChange={(nextValue) => {
                  const profileId = parseColorEncodingProfileId(nextValue);
                  const profile = getColorEncodingProfile(profileId);
                  updateActiveTargetInterpretation({
                    ...targetColorInterpretation,
                    profileId,
                    confidence: profile.status === "warning-only" ? "unknown" : "confirmed",
                    source: profile.status === "warning-only" ? "unknown" : "user-confirmed",
                    note: profile.warning
                  });
                }}
              />
              {targetColorInterpretation.headerSuggestedProfileId === undefined ? null : (
                <p className="profile-contract-row">
                  <span>Header 建议</span>
                  <strong>{getColorEncodingProfile(targetColorInterpretation.headerSuggestedProfileId).displayName}</strong>
                </p>
              )}
              {activeTarget?.originalFormat !== "DPX" || targetColorInterpretation.headerSuggestedProfileId !== undefined ? null : (
                <p className="profile-contract-row">
                  <span>Header 建议</span>
                  <strong>未可靠映射</strong>
                </p>
              )}
              {targetColorInterpretation.headerEvidence === undefined ? null : (
                <p className="profile-header-evidence">{targetColorInterpretation.headerEvidence}</p>
              )}
              <p className="profile-contract-row">
                <span>当前人工确认</span>
                <strong>{targetEncodingProfile.displayName}</strong>
              </p>
              <p className="profile-contract-row">
                <span>可靠性</span>
                <strong>{targetColorInterpretation.confidence === "confirmed" ? "已人工确认" : "低可信度"}</strong>
              </p>
              <p className="profile-contract-row">
                <span>实际预览处理</span>
                <strong>{targetEncodingProfile.status === "supported" ? "转换到 BT.709 Gamma 2.4" : "仅实验性显示"}</strong>
              </p>
              <p className={targetColorInterpretation.confidence === "confirmed" ? "dpx-interpretation-note" : "dpx-interpretation-note warning"}>
                {targetColorInterpretation.note}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-canvas-column glass-panel">
        <div className="floating-ai-status">
          <span className={isGenerating ? "status-dot generating" : "status-dot"} />
          <strong>{aiStatus}</strong>
        </div>

        <div className="canvas-toolbar">
          <button type="button">原图</button>
          <button className="active" type="button">
            效果图
          </button>
        </div>

        <div className="canvas-tools">
          <button title="局部放大" type="button" onClick={() => setIsPreviewLightboxOpen(true)}>
            <ZoomIn aria-hidden="true" />
          </button>
          <button title="全屏预览" type="button" onClick={() => void handleOpenFullscreenPreview()}>
            <Maximize aria-hidden="true" />
          </button>
        </div>

        <BeforeAfterPreview
          afterAlt={`${activeStyleName} 效果图`}
          afterImageUrl={afterImageUrl}
          beforeAlt={activeTarget?.name ?? "默认目标静帧"}
          beforeImageUrl={beforeImageUrl}
          containerRef={splitContainerRef}
          imageHeight={previewHeight}
          imageWidth={previewWidth}
          isWaitingForPreview={activeTarget !== null && result === null}
          stageRef={previewStageRef}
          splitPosition={splitPosition}
          onSplitStart={() => setIsDragging(true)}
        />

        <div className="preview-action-dock">
          <Button disabled={isGenerating} onClick={handleGenerate}>
            <Sparkles aria-hidden="true" />
            {isGenerating ? "正在分析色彩..." : "生成仿色预览"}
          </Button>
        </div>

        <div className="selected-style-strip">
          <span>选用风格: {activeStyleName} / 强度 {parameters.intensity}% / 生成记录 {sessionPreviewResults.length}</span>
        </div>

        {experienceMode === "professional" ? <div className="style-application-proof" aria-live="polite">
          <strong>已写入工作区</strong>
          <span>风格 {activeStyleName}</span>
          <span>参数 {currentPreparedPostLut?.parameterHash.slice(0, 12) ?? "等待重建"}</span>
          <span>Cube {currentPreparedPostLut?.cubeHash.slice(0, 12) ?? "等待重建"}</span>
        </div> : null}

        <div className="preview-status-stack">
          <span className={isGenerating ? "preview-status-badge updating" : "preview-status-badge"}>{message}</span>
        </div>
      </section>

      <section className="studio-control-column glass-panel">
        <QuickWorkflowPanel
          activeStyleName={activeStyleName}
          cameraSummary={`${selectedCameraProfile.brandLabel} / ${selectedCameraProfile.label}`}
          guard={quickPostExportGuard}
          mode={experienceMode}
          preferences={quickWorkflowPreferences}
          onGeneratePreview={handleGenerate}
          onModeChange={setExperienceMode}
          onOpenStyleLibrary={() => onNavigate("/styles")}
          onPreferencesChange={handleQuickWorkflowPreferencesChange}
        />
        <div className="reference-section">
          <h2>参考素材箱</h2>
          <div className="reference-preview">
            <img src={referencePreviewUrl} alt={activeReference?.name ?? selectedStyle.name} />
            <span>{activeReference === null ? "已激活目标风格" : "自定义参考图"}</span>
          </div>
          <div className="reference-actions">
            <UploadPanel
              accept={acceptedImageTypes}
              className="reference-upload-panel"
              description="JPG / PNG / WebP / TIFF / DPX"
              fileName={activeReference?.name ?? ""}
              inputMode="file"
              isProcessing={dpxImportingSource !== null}
              processingStatus={referenceDpxStatus}
              title="上传参考图"
              onFileChange={handleReferenceImageFileChange}
            />
            <Button variant="ghost" onClick={() => onNavigate("/styles")}>
              风格库
            </Button>
          </div>
          {referenceImageError.length > 0 ? <p className="upload-error">{referenceImageError}</p> : null}
          <MediaBin
            activeItemId={mediaState.activeReferenceId}
            emptyLabel="还没有上传参考图，当前使用风格库参考。"
            items={mediaState.referenceItems}
            title="当前会话参考素材"
            onDelete={handleDeleteReference}
            onSelect={handleSelectReference}
          />
          {activeReference === null ? null : (
            <div className="reference-color-profile-panel">
              <SelectControl
                label="参考图输入 Profile"
                options={referenceProfileOptions.map((profile) => ({
                  value: profile.id,
                  label: profile.displayName,
                  description: profile.intendedUse
                }))}
                value={referenceColorInterpretation.profileId}
                onChange={(nextValue) => {
                  const profileId = parseColorEncodingProfileId(nextValue);
                  const profile = getColorEncodingProfile(profileId);
                  updateActiveReferenceInterpretation({
                    ...referenceColorInterpretation,
                    profileId,
                    confidence: profile.status === "warning-only" ? "unknown" : "confirmed",
                    source: profile.status === "warning-only" ? "unknown" : "user-confirmed",
                    note: profile.warning
                  });
                }}
              />
              <p className={referenceEncodingProfile.status === "supported" ? "reference-profile-note" : "reference-profile-note warning"}>
                {referenceEncodingProfile.warning}
              </p>
            </div>
          )}
        </div>

        <div className="parameter-section">
          <h2>基础控制</h2>
          <AutoColorAnalysisPanel
            analysis={autoColorAnalysis}
            canRestore={analysisParameterSnapshot !== null}
            isAnalyzing={isAnalyzingColor}
            sceneId={analysisSceneId}
            suggestion={autoColorSuggestion}
            onAnalyze={() => void handleRunAutoColorAnalysis()}
            onApply={handleApplyAutoColorSuggestion}
            onRestore={handleRestoreAnalysisParameters}
            onSceneChange={(nextSceneId) => {
              setAnalysisSceneId(nextSceneId);
              clearAutoColorAnalysis();
            }}
          />
          <SliderControl label="风格强度" value={parameters.intensity} onChange={(value) => setNumberParameter("intensity", value)} />
          <div className="style-strength-presets" aria-label="风格强度快捷预设">
            {[
              { label: "安全", value: 35 },
              { label: "标准", value: 50 },
              { label: "浓郁", value: 70 },
              { label: "完整", value: 100 }
            ].map((preset) => (
              <button
                className={parameters.intensity === preset.value ? "active" : ""}
                key={preset.value}
                type="button"
                onClick={() => setNumberParameter("intensity", preset.value)}
              >
                <span>{preset.label}</span>
                <small>{preset.value}%</small>
              </button>
            ))}
            <span className="style-strength-custom">
              {[35, 50, 70, 100].includes(parameters.intensity) ? "预设" : `自定义 ${parameters.intensity}%`}
            </span>
          </div>
          <p className="style-strength-note">该强度直接烘焙进最终 LUT；DaVinci 节点 Key Output Gain 保持 1.000 即可获得网站预览强度。</p>
          <SliderControl label="对比度" min={-100} max={100} value={parameters.contrast} onChange={(value) => setNumberParameter("contrast", value)} />
          <SliderControl label="饱和度" min={-100} max={100} value={parameters.saturation} onChange={(value) => setNumberParameter("saturation", value)} />
          <SliderControl label="色温" min={-50} max={50} value={parameters.temperature} onChange={(value) => setNumberParameter("temperature", value)} />
          <SliderControl label="Tint / 色调" min={-50} max={50} value={parameters.tint} onChange={(value) => setNumberParameter("tint", value)} />
          <button
            aria-controls="workspace-advanced-controls"
            aria-expanded={isAdvancedControlsOpen}
            className="advanced-controls-toggle"
            type="button"
            onClick={() => setIsAdvancedControlsOpen((current) => !current)}
          >
            <span>高级控制与诊断</span>
            {isAdvancedControlsOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
          {isAdvancedControlsOpen ? (
            <div className="advanced-controls" id="workspace-advanced-controls">
              <SliderControl label="阴影匹配" value={parameters.shadowMatch} onChange={(value) => setNumberParameter("shadowMatch", value)} />
              <SliderControl label="中间调匹配" value={parameters.midtoneMatch} onChange={(value) => setNumberParameter("midtoneMatch", value)} />
              <SliderControl label="高光匹配" value={parameters.highlightMatch} onChange={(value) => setNumberParameter("highlightMatch", value)} />
              <div className="toggle-card">
                <ToggleSwitch checked={skinProtect} label="肤色保护" onChange={(value) => handleAdvancedToggleChange(setSkinProtect, value)} />
                <ToggleSwitch checked={preserveLuma} label="保留亮度结构" onChange={(value) => handleAdvancedToggleChange(setPreserveLuma, value)} />
                <ToggleSwitch checked={avoidOversaturation} label="防止过度饱和" onChange={(value) => handleAdvancedToggleChange(setAvoidOversaturation, value)} />
              </div>
              <p className="advanced-controls-note">高级控制与基础控制共用当前工作台参数；折叠或展开不会重置预览，也不会生成第二份 LUT。</p>
            </div>
          ) : null}
        </div>

        <PostLutExportSettings
          diagnostics={result?.preparedPostLut?.diagnostics}
          fileName={postLutFileName}
          inputReliability={result?.inputReliability}
          isPreviewCurrent={result?.configurationSignature === postConfigurationSignature}
          lookName={lookName}
          namingMode={postNamingMode}
          precision={parameters.precision}
          targetWasReanalyzed={targetAnalysisIsCurrent}
          showDiagnostics={experienceMode === "professional"}
          onLookNameChange={(value) => setLutName(sanitizeLookName(value))}
          onNamingModeChange={setPostNamingMode}
          onOpenCustomName={() => setIsCustomLutNameModalOpen(true)}
          onPrecisionChange={(value) => setParameters((current) => ({ ...current, precision: value }))}
        />

        <div className="workspace-actions">
          <Button variant="ghost" onClick={resetParameters}>
            重置参数
          </Button>
          <div className="workspace-action-item">
            <Button disabled={isExportingCube} variant="secondary" onClick={handleExportCube}>
            {isExportingCube ? "正在导出..." : "导出 .cube"}
            </Button>
            <small>后期软件创意 LUT</small>
          </div>
          <Button variant="ghost" onClick={() => setIsUsageGuideModalOpen(true)}>
            <HelpCircle aria-hidden="true" />
            使用说明
          </Button>
          {experienceMode === "professional" ? <Button variant="ghost" onClick={() => setIsRoundTripModalOpen(true)}>
            <FlaskConical aria-hidden="true" />
            DaVinci 回读校准
          </Button> : null}
          {experienceMode === "professional" ? <div className="workspace-action-item">
            <Button disabled={isExportingCameraLut} variant="secondary" onClick={() => setIsCameraLutModalOpen(true)}>
              <Camera aria-hidden="true" />
              相机监看 LUT
            </Button>
            <small>实验性相机监看文件</small>
          </div> : null}
        </div>
        {lastCubeDownloadArtifact === null ? null : (
          <div className={`cube-download-status cube-download-status-${cubeDownloadStatus}`} role="status">
            <div>
              <strong>{cubeDownloadStatusLabels[cubeDownloadStatus]}</strong>
              <span>{lastCubeDownloadArtifact.filename}</span>
            </div>
            <Button variant="ghost" onClick={handleRetryCubeDownload}>
              重新下载
            </Button>
            <details>
              <summary>文件验证详情</summary>
              <dl>
                <div><dt>文件大小</dt><dd>{formatFileSize(lastCubeDownloadArtifact.byteLength)}</dd></div>
                <div><dt>LUT 点数</dt><dd>{lastCubeDownloadArtifact.lutSize}</dd></div>
                <div><dt>Cube Hash</dt><dd title={lastCubeDownloadArtifact.cubeHash}>{lastCubeDownloadArtifact.cubeHash.slice(0, 12)}</dd></div>
                <div><dt>输入契约</dt><dd>{lastCubeDownloadArtifact.inputContract}</dd></div>
                <div><dt>输出契约</dt><dd>{lastCubeDownloadArtifact.outputContract}</dd></div>
              </dl>
            </details>
          </div>
        )}
      </section>

      <VideoFrameCaptureModal
        isOpen={isVideoFrameModalOpen}
        onCapture={handleCapturedFrame}
        onClose={() => setIsVideoFrameModalOpen(false)}
      />
      <CameraLutExportModal
        isExporting={isExportingCameraLut}
        isOpen={isCameraLutModalOpen}
        lookName={lookName}
        technicalTransform={technicalTransform}
        onClose={() => setIsCameraLutModalOpen(false)}
        onExport={handleExportCameraMonitoringLut}
        onTechnicalTransformChange={setTechnicalTransform}
      />
      <CustomLutNameModal
        automaticName={autoPostLutName}
        customName={postCustomFileName}
        isOpen={isCustomLutNameModalOpen}
        onClose={() => setIsCustomLutNameModalOpen(false)}
        onSave={setPostCustomFileName}
      />
      <LutUsageGuideModal
        hasReferenceImage={activeReference !== null}
        hasTargetImage={activeTarget !== null}
        inputColorConfig={inputColorConfig}
        isOpen={isUsageGuideModalOpen}
        lutName={lastExportResult?.fileName ?? postLutFileName}
        exportKind={lastExportResult?.exportKind ?? "post-creative"}
        exportTypeCode={lastExportResult?.exportTypeCode ?? "POST"}
        precision={parameters.precision}
        selectedStyleName={activeStyleName}
        targetEditor={quickWorkflowPreferences.targetEditor}
        onClose={() => setIsUsageGuideModalOpen(false)}
      />
      <DaVinciRoundTripModal
        currentWorkspaceCubeHash={lastExportResult?.cubeHash}
        currentWorkspaceCubeName={lastExportResult?.fileName ?? postLutFileName}
        isOpen={isRoundTripModalOpen}
        onClose={() => setIsRoundTripModalOpen(false)}
      />
      <PreviewLightbox
        afterAlt={`${activeStyleName} 效果图`}
        afterImageUrl={afterImageUrl}
        beforeAlt={activeTarget?.name ?? "默认目标静帧"}
        beforeImageUrl={beforeImageUrl}
        imageHeight={previewHeight}
        imageWidth={previewWidth}
        isOpen={isPreviewLightboxOpen}
        styleName={activeStyleName}
        onClose={() => setIsPreviewLightboxOpen(false)}
      />
    </>
  );
};
