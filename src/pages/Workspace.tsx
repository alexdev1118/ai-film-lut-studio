import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, HelpCircle, Info, Maximize, Sparkles, Upload, ZoomIn } from "lucide-react";
import { cameraBrandOptions, defaultCameraProfile, getCameraProfileById, getProfilesByBrand, toInputColorConfig } from "../data/cameraProfiles";
import { previewImages } from "../data/mockImages";
import { lutStyles } from "../data/styles";
import { exportCameraMonitoringLut, exportCubeLut, generateLocalColorPreview } from "../services/lutService";
import { revokeWorkspacePreviewResult, useWorkspaceState } from "../state/WorkspaceContext";
import type { CameraBrand, CameraLutCubeSize, CameraLutRange, CameraLutSupportProfile, CameraLutUseType, CameraMonitoringExposureConfig, CapturedFrame, LutParameters, LutPrecision, MediaItem, RoutePath, WorkspaceMediaState } from "../types";
import { formatFileSize, getImageMetadata, getImageSourceFromCssBackground, getReadableImageType, revokeMediaItem, toUploadedMediaItem } from "../utils/image";
import { defaultLutParameters, precisionOptions } from "../utils/lutMock";
import { capturedFrameToMediaItem } from "../utils/videoFrame";
import { BeforeAfterPreview } from "../components/lut/BeforeAfterPreview";
import { CameraLutExportModal } from "../components/lut/CameraLutExportModal";
import { LutUsageGuideModal } from "../components/lut/LutUsageGuideModal";
import { MediaBin } from "../components/lut/MediaBin";
import { PreviewLightbox } from "../components/lut/PreviewLightbox";
import { VideoFrameCaptureModal } from "../components/lut/VideoFrameCaptureModal";
import { Button } from "../components/ui/Button";
import { SelectControl } from "../components/ui/SelectControl";
import { SliderControl } from "../components/ui/SliderControl";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { UploadPanel } from "../components/ui/UploadPanel";

interface WorkspaceProps {
  readonly selectedStyleName: string;
  readonly onNavigate: (path: RoutePath) => void;
}

const acceptedImageTypes = "image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff";
const defaultTargetName = "target-frame-rec709.jpg";
const inputColorConfigStorageKey = "ai-film-lut-studio-input-color-config";
const autoPreviewDebounceMs = 400;
const defaultCanvasTargetImageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="0.45" stop-color="#7c245f"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
    <linearGradient id="light" x1="0" x2="1">
      <stop offset="0" stop-color="#f97316" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect x="170" y="180" width="1260" height="540" rx="36" fill="#05070a" opacity="0.48"/>
  <rect x="250" y="250" width="360" height="410" rx="18" fill="#f8fafc" opacity="0.82"/>
  <rect x="660" y="250" width="690" height="410" rx="18" fill="#020617" opacity="0.58"/>
  <rect x="720" y="310" width="520" height="40" fill="url(#light)" opacity="0.84"/>
  <rect x="720" y="400" width="420" height="32" fill="#f472b6" opacity="0.68"/>
  <rect x="720" y="486" width="560" height="32" fill="#22d3ee" opacity="0.58"/>
  <circle cx="1280" cy="308" r="54" fill="#f97316" opacity="0.74"/>
</svg>
`)}`;

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

export const Workspace = ({ selectedStyleName, onNavigate }: WorkspaceProps) => {
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
    selectedStyleKey,
    setSelectedStyleKey,
    setLastExportResult
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
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const mediaStateRef = useRef<WorkspaceMediaState>(mediaState);
  const previewRequestIdRef = useRef(0);
  const autoPreviewTimerRef = useRef<number | undefined>(undefined);

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
  const sourceImageUrl = activeTarget?.url ?? getImageSourceFromCssBackground(previewImages.sourceFrame);
  const canvasTargetImageUrl = activeTarget?.url ?? defaultCanvasTargetImageUrl;
  const referencePreviewUrl = activeReference?.url ?? getImageSourceFromCssBackground(selectedStyle.previewImage);
  const afterImageUrl = result === null ? (activeTarget === null ? getImageSourceFromCssBackground(selectedStyle.previewImage) : undefined) : result.previewImage;
  const hasPreviewHistory = result !== null || sessionPreviewResults.length > 0;

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
    if (selectedStyle.id === selectedStyleKey) {
      return;
    }

    setSelectedStyleKey(selectedStyle.id);
    setParameters((current) => ({ ...current, intensity: selectedStyle.recommendedIntensity }));

    if (mediaStateRef.current.activeReferenceId === undefined) {
      setLutName(`${selectedStyle.name}_Studio_V1`);
      setMessage(`已选择风格：${selectedStyle.name}`);
    }
  }, [selectedStyle, selectedStyleKey, setLutName, setMessage, setParameters, setSelectedStyleKey]);

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

  const runPreviewGeneration = async (mode: "manual" | "auto") => {
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;

    try {
      setIsGenerating(true);
      setMessage(mode === "auto" ? "正在更新预览..." : "AI 正在分析参考图色彩、影调与对比度...");
      const previewResult = await generateLocalColorPreview({
        targetImageUrl: canvasTargetImageUrl,
        referenceImageUrl: activeReference?.url,
        selectedStyleName: activeStyleName,
        parameters,
        skinToneProtection: skinProtect,
        preserveLuma,
        preventOversaturation: avoidOversaturation
      });

      if (requestId !== previewRequestIdRef.current) {
        revokeWorkspacePreviewResult(previewResult);
        return;
      }

      setResult((current) => {
        revokeWorkspacePreviewResult(current);
        return previewResult;
      });
      setSessionPreviewResults((current) => [previewResult, ...current].slice(0, 20));
      setMessage(mode === "auto" ? "预览已更新" : "预览已生成");
    } catch (error) {
      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : "预览生成失败，请更换图片或降低图片尺寸";
      setMessage(errorMessage);
    } finally {
      if (requestId === previewRequestIdRef.current) {
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
    canvasTargetImageUrl
  ]);

  const handleTargetImageFileChange = async (file: File) => {
    try {
      setTargetImageError("");
      const metadata = await getImageMetadata(file);
      const mediaItem = toUploadedMediaItem(file, metadata, "target");
      setMediaState((current) => ({
        ...current,
        targetItems: [mediaItem, ...current.targetItems],
        activeTargetId: mediaItem.id
      }));
      clearCanvasPreview();
      setMessage(hasPreviewHistory ? "目标素材已切换，预览将自动更新" : "目标素材已加入素材箱");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "图片读取失败，请更换图片";
      setTargetImageError(errorMessage);
    }
  };

  const handleReferenceImageFileChange = async (file: File) => {
    try {
      setReferenceImageError("");
      const metadata = await getImageMetadata(file);
      const mediaItem = toUploadedMediaItem(file, metadata, "reference");
      setMediaState((current) => ({
        ...current,
        referenceItems: [mediaItem, ...current.referenceItems],
        activeReferenceId: mediaItem.id
      }));
      clearCanvasPreview();
      setLutName("自定义参考图_Studio_V1");
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
      setMessage(hasPreviewHistory ? "视频帧已加入目标素材箱，预览将自动更新" : "视频帧已加入目标素材箱");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "当前帧截取失败，请调整时间点后重试";
      setTargetImageError(errorMessage);
    }
  };

  const handleSelectTarget = (itemId: string) => {
    setMediaState((current) => ({ ...current, activeTargetId: itemId }));
    clearCanvasPreview();
    setMessage(hasPreviewHistory ? "目标素材已切换，预览将自动更新" : "已切换目标素材");
  };

  const handleSelectReference = (itemId: string) => {
    setMediaState((current) => ({ ...current, activeReferenceId: itemId }));
    clearCanvasPreview();
    setLutName("自定义参考图_Studio_V1");
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
      setMessage(nextItems.length === 0 ? "已回到默认目标图" : "已切换到下一张目标素材");
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

      if (nextActiveReferenceId === undefined) {
        setLutName(`${selectedStyle.name}_Studio_V1`);
        setMessage(`已选择风格：${selectedStyle.name}`);
      } else {
        setLutName("自定义参考图_Studio_V1");
        setMessage("已切换参考图");
      }
    }
  };

  const handleGenerate = async () => {
    await runPreviewGeneration("manual");
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

    try {
      setIsExportingCube(true);
      const exportResult = await exportCubeLut({
        lutName,
        lutSize: getLutSizeFromPrecision(parameters.precision),
        parameters,
        skinToneProtection: skinProtect,
        preserveLuma,
        preventOversaturation: avoidOversaturation,
        referenceImageUrl: activeReference?.url,
        inputColorConfig
      });
      setLastExportResult(exportResult);
      setMessage(".cube LUT 已生成并开始下载");
    } catch (error) {
      console.error("LUT 导出失败", error);
      setMessage("LUT 导出失败，请稍后重试");
    } finally {
      setIsExportingCube(false);
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
        referenceImageUrl: activeReference?.url
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
    setParameters({ ...parameters, [key]: value });
  };

  const resetParameters = () => {
    setParameters({ ...defaultLutParameters, intensity: selectedStyle.recommendedIntensity, precision: parameters.precision });
    setSkinProtect(true);
    setPreserveLuma(true);
    setAvoidOversaturation(false);
  };

  const aiStatus = isGenerating ? (hasPreviewHistory ? "正在更新预览..." : "AI 正在分析参考图色彩、影调与对比度...") : result === null ? "AI 就绪" : "预览已生成";
  const previewFilter = result === null ? "none" : `sepia(0.18) saturate(${1 + parameters.saturation / 140}) contrast(${1 + parameters.contrast / 160})`;
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
              description="JPG / PNG / WebP / TIFF，≤20MB"
              fileName={activeTarget?.name ?? ""}
              icon={<Upload aria-hidden="true" />}
              inputMode="file"
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

          <section className="input-config-card">
            <div className="input-config-title">
              <span>输入素材配置</span>
              <small>{selectedCameraProfile.inputType.toUpperCase()}</small>
            </div>
            <SelectControl
              label="相机品牌"
              options={cameraBrandOptions.map((brand) => ({ value: brand.id, label: brand.label }))}
              value={selectedBrandId}
              onChange={(nextValue) => {
                const nextBrandId = nextValue as CameraBrand;
                const nextProfiles = getProfilesByBrand(nextBrandId);
                setSelectedBrandId(nextBrandId);
                setSelectedProfileId(nextProfiles[0]?.id ?? defaultCameraProfile.id);
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
              onChange={setSelectedProfileId}
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
          </section>

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
          beforeImageUrl={sourceImageUrl}
          containerRef={splitContainerRef}
          effectFilter={previewFilter}
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
          <span>选用风格: {activeStyleName} / 生成记录 {sessionPreviewResults.length}</span>
        </div>

        <div className="preview-status-stack">
          <span className={isGenerating ? "preview-status-badge updating" : "preview-status-badge"}>{message}</span>
        </div>
      </section>

      <section className="studio-control-column glass-panel">
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
              description="支持 JPG、PNG、WebP、TIFF，单张不超过 20MB"
              fileName={activeReference?.name ?? ""}
              inputMode="file"
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
        </div>

        <div className="parameter-section">
          <h2>参数调节</h2>
          <SliderControl label="风格强度" value={parameters.intensity} onChange={(value) => setNumberParameter("intensity", value)} />
          <SliderControl label="对比度" min={-100} max={100} value={parameters.contrast} onChange={(value) => setNumberParameter("contrast", value)} />
          <SliderControl label="饱和度" min={-100} max={100} value={parameters.saturation} onChange={(value) => setNumberParameter("saturation", value)} />
          <SliderControl label="色温" min={-50} max={50} value={parameters.temperature} onChange={(value) => setNumberParameter("temperature", value)} />
          <SliderControl label="Tint / 色调" min={-50} max={50} value={parameters.tint} onChange={(value) => setNumberParameter("tint", value)} />
          <SliderControl label="阴影匹配" value={parameters.shadowMatch} onChange={(value) => setNumberParameter("shadowMatch", value)} />
          <SliderControl label="中间调匹配" value={parameters.midtoneMatch} onChange={(value) => setNumberParameter("midtoneMatch", value)} />
          <SliderControl label="高光匹配" value={parameters.highlightMatch} onChange={(value) => setNumberParameter("highlightMatch", value)} />
        </div>

        <div className="toggle-card">
          <ToggleSwitch checked={skinProtect} label="肤色保护" onChange={setSkinProtect} />
          <ToggleSwitch checked={preserveLuma} label="保留亮度结构" onChange={setPreserveLuma} />
          <ToggleSwitch checked={avoidOversaturation} label="防止过度饱和" onChange={setAvoidOversaturation} />
        </div>

        <div className="workspace-actions">
          <Button variant="ghost" onClick={resetParameters}>
            重置参数
          </Button>
          <Button disabled={isExportingCube} variant="secondary" onClick={handleExportCube}>
            {isExportingCube ? "正在导出..." : "导出 .cube"}
          </Button>
          <Button disabled={isExportingCameraLut} variant="secondary" onClick={() => setIsCameraLutModalOpen(true)}>
            <Camera aria-hidden="true" />
            相机监看 LUT
          </Button>
        </div>
      </section>

      <footer className="workspace-export-footer">
        <div className="export-footer-left">
          <label>
            <span>LUT 名称</span>
            <input value={lutName} onChange={(event) => setLutName(event.currentTarget.value)} />
          </label>
          <SelectControl
            className="footer-select-control"
            label="LUT 精度"
            options={precisionOptions.map((option) => ({
              value: option,
              label: option.replace("x", " / ").split(" / ")[0],
              description: option
            }))}
            value={parameters.precision}
            onChange={(nextValue) => setParameters({ ...parameters, precision: nextValue as LutPrecision })}
          />
        </div>
        <div className="export-footer-actions">
          <button type="button" onClick={() => setIsUsageGuideModalOpen(true)}>
            <HelpCircle aria-hidden="true" />
            使用说明
          </button>
          <button disabled={isExportingCube} type="button" onClick={handleExportCube}>
            <Download aria-hidden="true" />
            {isExportingCube ? "正在导出" : "导出 LUT"}
          </button>
        </div>
      </footer>

      <VideoFrameCaptureModal
        isOpen={isVideoFrameModalOpen}
        onCapture={handleCapturedFrame}
        onClose={() => setIsVideoFrameModalOpen(false)}
      />
      <CameraLutExportModal
        isExporting={isExportingCameraLut}
        isOpen={isCameraLutModalOpen}
        onClose={() => setIsCameraLutModalOpen(false)}
        onExport={handleExportCameraMonitoringLut}
      />
      <LutUsageGuideModal
        hasReferenceImage={activeReference !== null}
        hasTargetImage={activeTarget !== null}
        inputColorConfig={inputColorConfig}
        isOpen={isUsageGuideModalOpen}
        lutName={lutName}
        precision={parameters.precision}
        selectedStyleName={activeStyleName}
        onClose={() => setIsUsageGuideModalOpen(false)}
      />
      <PreviewLightbox
        afterAlt={`${activeStyleName} 效果图`}
        afterImageUrl={afterImageUrl}
        beforeAlt={activeTarget?.name ?? "默认目标静帧"}
        beforeImageUrl={sourceImageUrl}
        imageHeight={previewHeight}
        imageWidth={previewWidth}
        isOpen={isPreviewLightboxOpen}
        styleName={activeStyleName}
        onClose={() => setIsPreviewLightboxOpen(false)}
      />
    </>
  );
};
