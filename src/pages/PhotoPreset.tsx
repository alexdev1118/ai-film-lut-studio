import { useState } from "react";
import { generatePhotoPresetMock } from "../services/lutService";
import type { PhotoPresetResult } from "../types";
import { lutStyles } from "../data/styles";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { SliderControl } from "../components/ui/SliderControl";
import { UploadPanel } from "../components/ui/UploadPanel";

export const PhotoPreset = () => {
  const [sourceImageName, setSourceImageName] = useState("portrait-session.jpg");
  const [styleName, setStyleName] = useState(lutStyles[3].name);
  const [intensity, setIntensity] = useState(55);
  const [result, setResult] = useState<PhotoPresetResult | null>(null);
  const [message, setMessage] = useState("选择风格后可以模拟生成图片预览。");

  const handleGenerate = async () => {
    try {
      setMessage("正在模拟生成图片预览...");
      const presetResult = await generatePhotoPresetMock({ sourceImageName, styleName, intensity });
      setResult(presetResult);
      setMessage(presetResult.status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "生成图片预设时发生未知错误。";
      setMessage(errorMessage);
    }
  };

  return (
    <div className="workspace-grid">
      <div className="workspace-main">
        <GlassCard>
          <p className="eyebrow">图片预设</p>
          <h1>模拟生成图片调色预览</h1>
          <UploadPanel
            description="支持 JPG、PNG、TIFF"
            fileName={sourceImageName}
            title="拖拽或点击上传图片"
            onFileNameChange={setSourceImageName}
          />
          <label className="select-control">
            <span>预设风格</span>
            <select value={styleName} onChange={(event) => setStyleName(event.currentTarget.value)}>
              {lutStyles.map((style) => (
                <option key={style.id} value={style.name}>
                  {style.name}
                </option>
              ))}
            </select>
          </label>
          <SliderControl label="风格强度" value={intensity} onChange={setIntensity} />
          <Button onClick={handleGenerate}>生成图片预览</Button>
          <p className="status-line">{message}</p>
        </GlassCard>
      </div>
      <GlassCard className="preview-card">
        <p className="eyebrow">图片预览</p>
        <div className="image-preview result-preview" style={{ background: result?.previewImage }}>
          <span>{result === null ? "等待生成" : result.styleName}</span>
        </div>
      </GlassCard>
    </div>
  );
};
