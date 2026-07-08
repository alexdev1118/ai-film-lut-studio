import { useEffect, useMemo, useRef, useState } from "react";
import { Download, HelpCircle, Info, Maximize, Sparkles, Upload, ZoomIn } from "lucide-react";
import { lutStyles } from "../data/styles";
import { previewImages } from "../data/mockImages";
import { generatePreviewMock } from "../services/lutService";
import type {
  ColorSpace,
  LutParameters,
  LutPrecision,
  MediaItem,
  PreviewResult,
  RoutePath,
  WorkspaceMediaState
} from "../types";
import { colorSpaceOptions, defaultLutParameters, precisionOptions } from "../utils/lutMock";
import {
  formatFileSize,
  getImageMetadata,
  getImageSourceFromCssBackground,
  getReadableImageType,
  revokeMediaItem,
  toUploadedMediaItem
} from "../utils/image";
import { BeforeAfterPreview } from "../components/lut/BeforeAfterPreview";
import { MediaBin } from "../components/lut/MediaBin";
import { Button } from "../components/ui/Button";
import { SliderControl } from "../components/ui/SliderControl";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { UploadPanel } from "../components/ui/UploadPanel";

interface WorkspaceProps {
  readonly selectedStyleName: string;
  readonly onNavigate: (path: RoutePath) => void;
}

const acceptedImageTypes = "image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff";
const defaultTargetName = "target-frame-rec709.jpg";
const defaultReferenceName = "reference-style.jpg";

const defaultMediaState: WorkspaceMediaState = {
  targetItems: [],
  referenceItems: []
};

const getImageDimensionsLabel = (image: MediaItem): string => {
  if (typeof image.width === "number" && typeof image.height === "number") {
    return `${image.width}x${image.height}`;
  }

  return "读取中";
};

const getNextActiveId = (items: readonly MediaItem[], deletedIndex: number): string | undefined => {
  return items[deletedIndex]?.id ?? items[deletedIndex - 1]?.id ?? items[0]?.id;
};

export const Workspace = ({ selectedStyleName, onNavigate }: WorkspaceProps) => {
  const selectedStyle = useMemo(() => {
    const styleKey = selectedStyleName.trim();

    if (styleKey.length === 0) {
      return lutStyles[0];
    }

    return lutStyles.find((style) => style.id === styleKey || style.name === styleKey) ?? lutStyles[0];
  }, [selectedStyleName]);

  const [mediaState, setMediaState] = useState<WorkspaceMediaState>(defaultMediaState);
  const [targetImageError, setTargetImageError] = useState("");
  const [referenceImageError, setReferenceImageError] = useState("");
  const [parameters, setParameters] = useState<LutParameters>({
    ...defaultLutParameters,
    intensity: selectedStyle.recommendedIntensity
  });
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [sessionPreviewResults, setSessionPreviewResults] = useState<readonly PreviewResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("AI 就绪");
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [skinProtect, setSkinProtect] = useState(true);
  const [preserveLuma, setPreserveLuma] = useState(true);
  const [avoidOversaturation, setAvoidOversaturation] = useState(false);
  const [lutName, setLutName] = useState(`${selectedStyle.name}_Studio_V1`);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const mediaStateRef = useRef<WorkspaceMediaState>(defaultMediaState);

  const activeTarget = useMemo(
    () => mediaState.targetItems.find((item) => item.id === mediaState.activeTargetId) ?? null,
    [mediaState.activeTargetId, mediaState.targetItems]
  );

  const activeReference = useMemo(
    () => mediaState.referenceItems.find((item) => item.id === mediaState.activeReferenceId) ?? null,
    [mediaState.activeReferenceId, mediaState.referenceItems]
  );

  useEffect(() => {
    mediaStateRef.current = mediaState;
  }, [mediaState]);

  useEffect(() => {
    setParameters((current) => ({ ...current, intensity: selectedStyle.recommendedIntensity }));

    if (mediaStateRef.current.activeReferenceId === undefined) {
      setLutName(`${selectedStyle.name}_Studio_V1`);
      setMessage(`已选择风格：${selectedStyle.name}`);
    }
  }, [selectedStyle]);

  useEffect(() => {
    return () => {
      mediaStateRef.current.targetItems.forEach((item) => revokeMediaItem(item));
      mediaStateRef.current.referenceItems.forEach((item) => revokeMediaItem(item));
    };
  }, []);

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
      setResult(null);
      setMessage("目标素材已加入素材箱");
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
      setResult(null);
      setLutName("自定义参考图_Studio_V1");
      setMessage("已选择风格：自定义参考图");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "图片读取失败，请更换图片";
      setReferenceImageError(errorMessage);
    }
  };

  const handleSelectTarget = (itemId: string) => {
    setMediaState((current) => ({ ...current, activeTargetId: itemId }));
    setResult(null);
    setMessage("已切换目标素材");
  };

  const handleSelectReference = (itemId: string) => {
    setMediaState((current) => ({ ...current, activeReferenceId: itemId }));
    setResult(null);
    setLutName("自定义参考图_Studio_V1");
    setMessage("已选择风格：自定义参考图");
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
      setResult(null);
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
      setResult(null);

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
    try {
      setIsGenerating(true);
      setMessage("AI 正在分析参考图色彩、影调与对比度...");
      const previewResult = await generatePreviewMock({
        targetFrameName: activeTarget?.name ?? defaultTargetName,
        referenceImageName: activeReference?.name ?? defaultReferenceName,
        selectedStyleName: activeReference === null ? selectedStyle.name : "自定义参考图",
        parameters
      });
      setResult(previewResult);
      setSessionPreviewResults((current) => [previewResult, ...current].slice(0, 20));
      setMessage("预览已生成");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "生成预览时发生未知错误。";
      setMessage(errorMessage);
    } finally {
      setIsGenerating(false);
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
    setParameters({ ...defaultLutParameters, intensity: selectedStyle.recommendedIntensity });
    setSkinProtect(true);
    setPreserveLuma(true);
    setAvoidOversaturation(false);
  };

  const activeStyleName = activeReference === null ? selectedStyle.name : "自定义参考图";
  const sourceImageUrl = activeTarget?.url ?? getImageSourceFromCssBackground(previewImages.sourceFrame);
  const referencePreviewUrl = activeReference?.url ?? getImageSourceFromCssBackground(selectedStyle.previewImage);
  const afterImageUrl =
    result === null
      ? activeTarget === null
        ? getImageSourceFromCssBackground(selectedStyle.previewImage)
        : undefined
      : activeTarget === null
        ? getImageSourceFromCssBackground(result.previewImage)
        : sourceImageUrl;
  const aiStatus = isGenerating ? "AI 正在分析参考图色彩、影调与对比度..." : result === null ? "AI 就绪" : "预览已生成";
  const previewFilter =
    result === null ? "none" : `sepia(0.18) saturate(${1 + parameters.saturation / 140}) contrast(${1 + parameters.contrast / 160})`;
  const previewWidth = activeTarget?.width ?? 16;
  const previewHeight = activeTarget?.height ?? 9;

  return (
    <>
      <section className="studio-source-column glass-panel">
        <div className="panel-title-row">
          <h1>目标素材箱</h1>
          <Info aria-hidden="true" />
        </div>

        <UploadPanel
          accept={acceptedImageTypes}
          className="studio-upload-dropzone"
          description="支持 JPG、PNG、WebP、TIFF，单张不超过 20MB"
          fileName={activeTarget?.name ?? ""}
          icon={<Upload aria-hidden="true" />}
          inputMode="file"
          title="上传目标静帧"
          onFileChange={handleTargetImageFileChange}
        />
        {targetImageError.length > 0 ? <p className="upload-error">{targetImageError}</p> : null}

        <MediaBin
          activeItemId={mediaState.activeTargetId}
          emptyLabel="还没有上传目标图，当前使用默认 mock 静帧。"
          items={mediaState.targetItems}
          title="当前会话目标素材"
          onDelete={handleDeleteTarget}
          onSelect={handleSelectTarget}
        />

        <label className="studio-select-control">
          <span>输入色彩空间</span>
          <select
            value={parameters.inputColorSpace}
            onChange={(event) => setParameters({ ...parameters, inputColorSpace: event.currentTarget.value as ColorSpace })}
          >
            {colorSpaceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <p className="source-hint">
          <Sparkles aria-hidden="true" />
          V1 建议使用 Rec.709 或已还原素材
        </p>

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
          <button title="局部放大" type="button">
            <ZoomIn aria-hidden="true" />
          </button>
          <button title="适配屏幕" type="button">
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
          选用风格: {activeStyleName} / 生成记录 {sessionPreviewResults.length}
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
          <Button variant="secondary" onClick={() => onNavigate("/export")}>
            导出 .cube
          </Button>
        </div>
      </section>

      <footer className="workspace-export-footer">
        <div className="export-footer-left">
          <label>
            <span>LUT 名称</span>
            <input value={lutName} onChange={(event) => setLutName(event.currentTarget.value)} />
          </label>
          <label>
            <span>LUT 精度</span>
            <select
              value={parameters.precision}
              onChange={(event) => setParameters({ ...parameters, precision: event.currentTarget.value as LutPrecision })}
            >
              {precisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace("x", " / ").split(" / ")[0]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="export-footer-actions">
          <button type="button">
            <HelpCircle aria-hidden="true" />
            使用说明
          </button>
          <button type="button" onClick={() => onNavigate("/export")}>
            <Download aria-hidden="true" />
            导出 LUT
          </button>
        </div>
      </footer>
    </>
  );
};
