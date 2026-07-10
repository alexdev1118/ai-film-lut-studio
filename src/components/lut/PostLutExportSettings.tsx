import { useState } from "react";
import { Check, Copy, Settings2 } from "lucide-react";
import type { LutPrecision, PostLutNamingMode } from "../../types";
import { precisionOptions } from "../../utils/lutMock";
import { HelpPopover } from "../ui/HelpPopover";
import { SelectControl } from "../ui/SelectControl";
import { lutHelpContent } from "../../data/lutHelpContent";

interface PostLutExportSettingsProps {
  readonly lookName: string;
  readonly precision: LutPrecision;
  readonly namingMode: PostLutNamingMode;
  readonly fileName: string;
  readonly onLookNameChange: (value: string) => void;
  readonly onPrecisionChange: (value: LutPrecision) => void;
  readonly onNamingModeChange: (value: PostLutNamingMode) => void;
  readonly onOpenCustomName: () => void;
}

export const PostLutExportSettings = ({
  lookName,
  precision,
  namingMode,
  fileName,
  onLookNameChange,
  onPrecisionChange,
  onNamingModeChange,
  onOpenCustomName
}: PostLutExportSettingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const lutSize = precision.split("x")[0];

  const handleCopyFileName = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(fileName);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (error) {
      console.error("复制 LUT 文件名失败", error);
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2400);
    }
  };

  return (
    <section className="post-lut-export-settings" aria-label="导出设置">
      <header className="post-lut-export-settings-header">
        <div>
          <span className="post-lut-export-settings-kicker"><Settings2 aria-hidden="true" /> 导出设置</span>
          <p>POST 路 {lookName} 路 {lutSize}pt</p>
        </div>
        <button aria-expanded={isExpanded} className="post-lut-settings-toggle" type="button" onClick={() => setIsExpanded((current) => !current)}>
          {isExpanded ? "收起设置" : "展开设置"}
        </button>
      </header>

      <div className="post-lut-file-preview" title={fileName}>
        <span>导出文件名预览</span>
        <strong>{fileName}</strong>
        <button aria-label="复制导出文件名" className="post-lut-copy-button" type="button" onClick={() => void handleCopyFileName()}>
          {copyStatus === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copyStatus === "copied" ? "已复制" : "复制"}
        </button>
        {copyStatus === "failed" ? <small>复制失败，请手动复制</small> : null}
      </div>

      {isExpanded ? (
        <div className="post-lut-settings-fields">
          <label className="post-lut-look-field">
            <span>风格名称</span>
            <input value={lookName} onChange={(event) => onLookNameChange(event.currentTarget.value)} />
          </label>
          <SelectControl
            label="LUT 精度"
            options={precisionOptions.map((option) => ({
              value: option,
              label: option.replace("x", " / ").split(" / ")[0],
              description: option
            }))}
            value={precision}
            onChange={(nextValue) => onPrecisionChange(nextValue as LutPrecision)}
          />
          <SelectControl
            label={<span className="field-label-with-help">命名模式<HelpPopover content={lutHelpContent.postNamingMode} /></span>}
            options={[
              { value: "simple", label: "简洁命名", description: "POST_Rec709_Look_33pt_v1" },
              { value: "full", label: "完整命名", description: "附加素材来源提示 SRC" }
            ]}
            value={namingMode}
            onChange={(nextValue) => onNamingModeChange(nextValue as PostLutNamingMode)}
          />
          <button className="post-lut-advanced-name-button" type="button" onClick={onOpenCustomName}>
            高级自定义文件名
          </button>
        </div>
      ) : null}
    </section>
  );
};
