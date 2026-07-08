import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronsLeftRight,
  Download,
  HelpCircle,
  Info,
  Maximize,
  Sparkles,
  Upload,
  ZoomIn
} from "lucide-react";
import { lutStyles } from "../data/styles";
import { previewImages } from "../data/mockImages";
import { generatePreviewMock } from "../services/lutService";
import type { ColorSpace, LutParameters, LutPrecision, PreviewResult, RoutePath, UploadedImage } from "../types";
import { colorSpaceOptions, defaultLutParameters, precisionOptions } from "../utils/lutMock";
import {
  formatFileSize,
  getImageMetadata,
  getReadableImageType,
  revokeUploadedImage,
  toUploadedImage
} from "../utils/image";
import { Button } from "../components/ui/Button";
import { SliderControl } from "../components/ui/SliderControl";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { UploadPanel } from "../components/ui/UploadPanel";

interface WorkspaceProps {
  readonly selectedStyleName: string;
  readonly onNavigate: (path: RoutePath) => void;
}

const acceptedImageTypes = "image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff";

const createImageBackground = (url: string): string => {
  return `url("${url}") center / cover no-repeat`;
};

const getImageDimensionsLabel = (image: UploadedImage): string => {
  if (typeof image.width === "number" && typeof image.height === "number") {
    return `${image.width}x${image.height}`;
  }

  return "读取中";
};

export const Workspace = ({ selectedStyleName, onNavigate }: WorkspaceProps) => {
  const selectedStyle = useMemo(() => {
    const styleKey = selectedStyleName.trim();

    if (styleKey.length === 0) {
      return lutStyles[0];
    }

    return lutStyles.find((style) => style.id === styleKey || style.name === styleKey) ?? lutStyles[0];
  }, [selectedStyleName]);

  const [targetFrameName, setTargetFrameName] = useState("target-frame-rec709.jpg");
  const [referenceImageName, setReferenceImageName] = useState("reference-style.jpg");
  const [targetImage, setTargetImage] = useState<UploadedImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<UploadedImage | null>(null);
  const [targetImageError, setTargetImageError] = useState("");
  const [referenceImageError, setReferenceImageError] = useState("");
  const [parameters, setParameters] = useState<LutParameters>({
    ...defaultLutParameters,
    intensity: selectedStyle.recommendedIntensity
  });
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("AI 就绪");
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [skinProtect, setSkinProtect] = useState(true);
  const [preserveLuma, setPreserveLuma] = useState(true);
  const [avoidOversaturation, setAvoidOversaturation] = useState(false);
  const [lutName, setLutName] = useState(`${selectedStyle.name}_Studio_V1`);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const targetImageRef = useRef<UploadedImage | null>(null);
  const referenceImageRef = useRef<UploadedImage | null>(null);

  useEffect(() => {
    setParameters((current) => ({ ...current, intensity: selectedStyle.recommendedIntensity }));

    if (referenceImageRef.current === null) {
      setLutName(`${selectedStyle.name}_Studio_V1`);
      setMessage(`已选择风格：${selectedStyle.name}`);
    }
  }, [selectedStyle]);

  useEffect(() => {
    return () => {
      revokeUploadedImage(targetImageRef.current);
      revokeUploadedImage(referenceImageRef.current);
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

  const replaceTargetImage = (image: UploadedImage | null) => {
    revokeUploadedImage(targetImageRef.current);
    targetImageRef.current = image;
    setTargetImage(image);
  };

  const replaceReferenceImage = (image: UploadedImage | null) => {
    revokeUploadedImage(referenceImageRef.current);
    referenceImageRef.current = image;
    setReferenceImage(image);
  };

  const handleTargetImageFileChange = async (file: File) => {
    try {
      setTargetImageError("");
      const metadata = await getImageMetadata(file);
      const uploadedImage = toUploadedImage(file, metadata);
      replaceTargetImage(uploadedImage);
      setTargetFrameName(uploadedImage.name);
      setResult(null);
      setMessage("目标素材已载入");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "图片读取失败，请更换图片";
      setTargetImageError(errorMessage);
    }
  };

  const handleReferenceImageFileChange = async (file: File) => {
    try {
      setReferenceImageError("");
      const metadata = await getImageMetadata(file);
      const uploadedImage = toUploadedImage(file, metadata);
      replaceReferenceImage(uploadedImage);
      setReferenceImageName(uploadedImage.name);
      setResult(null);
      setLutName("自定义参考图_Studio_V1");
      setMessage("已选择风格：自定义参考图");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "图片读取失败，请更换图片";
      setReferenceImageError(errorMessage);
    }
  };

  const handleClearTargetImage = () => {
    replaceTargetImage(null);
    setTargetImageError("");
    setTargetFrameName("target-frame-rec709.jpg");
    setResult(null);
    setMessage("目标素材已清除");
  };

  const handleClearReferenceImage = () => {
    replaceReferenceImage(null);
    setReferenceImageError("");
    setReferenceImageName("reference-style.jpg");
    setResult(null);
    setLutName(`${selectedStyle.name}_Studio_V1`);
    setMessage(`已选择风格：${selectedStyle.name}`);
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setMessage("AI 正在分析参考图色彩、影调与对比度...");
      const previewResult = await generatePreviewMock({
        targetFrameName,
        referenceImageName,
        selectedStyleName: referenceImage === null ? selectedStyle.name : "自定义参考图",
        parameters
      });
      setResult(previewResult);
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

  const activeStyleName = referenceImage === null ? selectedStyle.name : "自定义参考图";
  const sourceBackground = targetImage === null ? previewImages.sourceFrame : createImageBackground(targetImage.url);
  const referenceBackground = referenceImage === null ? selectedStyle.previewImage : createImageBackground(referenceImage.url);
  const afterBackground = result?.previewImage ?? selectedStyle.previewImage;
  const aiStatus = isGenerating ? "AI 正在分析参考图色彩、影调与对比度..." : result === null ? "AI 就绪" : "预览已生成";

  return (
    <>
      <section className="studio-source-column glass-panel">
        <div className="panel-title-row">
          <h1>目标素材</h1>
          <Info aria-hidden="true" />
        </div>

        <UploadPanel
          accept={acceptedImageTypes}
          className="studio-upload-dropzone"
          description="支持 JPG、PNG、WebP、TIFF，单张不超过 20MB"
          fileName={targetImage?.name ?? ""}
          icon={<Upload aria-hidden="true" />}
          inputMode="file"
          title="拖拽或点击上传目标静帧"
          onFileChange={handleTargetImageFileChange}
        />
        {targetImageError.length > 0 ? <p className="upload-error">{targetImageError}</p> : null}

        <div className="source-thumbnail" style={{ background: sourceBackground }}>
          {targetImage === null ? null : (
            <button type="button" onClick={handleClearTargetImage}>
              清除图片
            </button>
          )}
        </div>

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
            <strong>{targetImage?.name ?? targetFrameName}</strong>
          </p>
          <p>
            <span>分辨率</span>
            <strong>{targetImage === null ? "3840x2160" : getImageDimensionsLabel(targetImage)}</strong>
          </p>
          <p>
            <span>格式</span>
            <strong>{targetImage === null ? "JPG" : getReadableImageType(targetImage.type)}</strong>
          </p>
          <p>
            <span>文件大小</span>
            <strong>{targetImage === null ? "2.8 MB" : formatFileSize(targetImage.size)}</strong>
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

        <div className="split-preview-stage">
          <div ref={splitContainerRef} className="split-preview-frame">
            <div className="split-image before" style={{ background: sourceBackground }} />
            <div
              className="split-image after"
              style={{
                background: afterBackground,
                clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
                filter: result === null ? "none" : `sepia(0.18) saturate(${1 + parameters.saturation / 140}) contrast(${1 + parameters.contrast / 160})`
              }}
            />
            <button
              aria-label="拖动对比线"
              className="split-handle"
              style={{ left: `${splitPosition}%` }}
              type="button"
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <ChevronsLeftRight aria-hidden="true" />
            </button>
            <span className="preview-label before-label">原图</span>
            <span className="preview-label after-label">效果图</span>
          </div>
        </div>

        <div className="selected-style-strip">选用风格: {activeStyleName}</div>
      </section>

      <section className="studio-control-column glass-panel">
        <div className="reference-section">
          <h2>参考图</h2>
          <div className="reference-preview" style={{ background: referenceBackground }}>
            <span>{referenceImage === null ? "已激活目标风格" : "自定义参考图"}</span>
          </div>
          <div className="reference-actions">
            <UploadPanel
              accept={acceptedImageTypes}
              className="reference-upload-panel"
              description="点击选择参考图"
              fileName={referenceImage?.name ?? ""}
              inputMode="file"
              title="上传参考图"
              onFileChange={handleReferenceImageFileChange}
            />
            <Button variant="ghost" onClick={() => onNavigate("/styles")}>
              风格库
            </Button>
          </div>
          {referenceImageError.length > 0 ? <p className="upload-error">{referenceImageError}</p> : null}
          {referenceImage === null ? null : (
            <button className="clear-reference-button" type="button" onClick={handleClearReferenceImage}>
              清除图片
            </button>
          )}
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
          <Button disabled={isGenerating} onClick={handleGenerate}>
            <Sparkles aria-hidden="true" />
            {isGenerating ? "正在分析色彩..." : "生成仿色预览"}
          </Button>
          <div>
            <Button variant="ghost" onClick={resetParameters}>
              重置参数
            </Button>
            <Button variant="secondary" onClick={() => onNavigate("/export")}>
              导出 .cube
            </Button>
          </div>
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
