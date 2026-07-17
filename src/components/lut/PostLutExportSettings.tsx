import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Settings2 } from "lucide-react";
import type { LutConsistencyDiagnostics, LutPrecision, PostLutNamingMode } from "../../types";
import { precisionOptions } from "../../utils/lutMock";
import { HelpPopover } from "../ui/HelpPopover";
import { SelectControl } from "../ui/SelectControl";
import { lutHelpContent } from "../../data/lutHelpContent";

interface PostLutExportSettingsProps {
  readonly lookName: string;
  readonly precision: LutPrecision;
  readonly namingMode: PostLutNamingMode;
  readonly fileName: string;
  readonly diagnostics?: LutConsistencyDiagnostics;
  readonly inputReliability?: "reliable" | "experimental" | "unknown";
  readonly isPreviewCurrent: boolean;
  readonly targetWasReanalyzed: boolean;
  readonly showDiagnostics?: boolean;
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
  diagnostics,
  inputReliability,
  isPreviewCurrent,
  targetWasReanalyzed,
  showDiagnostics = true,
  onLookNameChange,
  onPrecisionChange,
  onNamingModeChange,
  onOpenCustomName
}: PostLutExportSettingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const lutSize = precision.split("x")[0];

  const handlePrecisionChange = (value: string): void => {
    if (value === "17x17x17" || value === "33x33x33" || value === "65x65x65") {
      onPrecisionChange(value);
    }
  };

  const handleNamingModeChange = (value: string): void => {
    if (value === "simple" || value === "full") {
      onNamingModeChange(value);
    }
  };

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
            onChange={handlePrecisionChange}
          />
          <SelectControl
            label={<span className="field-label-with-help">命名模式<HelpPopover content={lutHelpContent.postNamingMode} /></span>}
            options={[
              { value: "simple", label: "简洁命名", description: "POST_BT709_G24_FULL_Look_33pt_v1" },
              { value: "full", label: "完整命名", description: "附加素材来源提示 SRC" }
            ]}
            value={namingMode}
            onChange={handleNamingModeChange}
          />
          <button className="post-lut-advanced-name-button" type="button" onClick={onOpenCustomName}>
            高级自定义文件名
          </button>
        </div>
      ) : null}

      {showDiagnostics ? <div className="post-lut-diagnostics">
        <button
          aria-expanded={isDiagnosticsExpanded}
          className="post-lut-diagnostics-toggle"
          type="button"
          onClick={() => setIsDiagnosticsExpanded((current) => !current)}
        >
          <span>
            <strong>Cube 一致性诊断</strong>
            <small>{diagnostics === undefined ? "生成预览后可用" : diagnostics.passed && isPreviewCurrent ? "通过" : "需要更新"}</small>
          </span>
          {isDiagnosticsExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        {isDiagnosticsExpanded ? (
          <div className="post-lut-diagnostics-body">
            <p><span>预览来源</span><strong>{diagnostics?.previewSource === "final-export-cube" ? "最终导出 Cube" : "尚未生成"}</strong></p>
            <p><span>输入契约</span><strong>{diagnostics?.inputContract ?? "Rec.709 / Gamma 2.4 / Full"}</strong></p>
            <p><span>输出契约</span><strong>{diagnostics?.outputContract ?? "Rec.709 / Gamma 2.4 / Full"}</strong></p>
            <p><span>素材输入 Profile</span><strong>{diagnostics?.inputProfileId ?? "待生成"}</strong></p>
            <p><span>POST 输出 Profile</span><strong>{diagnostics?.outputProfileId ?? "bt709-g24-full"}</strong></p>
            <p><span>显示转换</span><strong>{diagnostics?.previewDisplayTransformId ?? "bt709-g24-to-browser-srgb"}</strong></p>
            <p><span>LUT / 数据行</span><strong>{diagnostics === undefined ? `${lutSize}pt / 待生成` : `${diagnostics.lutSize}pt / ${diagnostics.dataLineCount}`}</strong></p>
            <p><span>平均 / P95 误差</span><strong>{diagnostics === undefined ? "待生成" : `${diagnostics.averageRgbError.toFixed(6)} / ${diagnostics.p95RgbError.toFixed(6)}`}</strong></p>
            <p><span>最大误差</span><strong>{diagnostics === undefined ? "待生成" : diagnostics.maximumRgbError.toFixed(6)}</strong></p>
            <p><span>参数 Hash</span><code>{diagnostics?.parameterHash.slice(0, 12) ?? "待生成"}</code></p>
            <p><span>输入解释 Hash</span><code>{diagnostics?.inputInterpretationHash.slice(0, 12) ?? "待生成"}</code></p>
            <p><span>Cube Hash</span><code>{diagnostics?.cubeHash.slice(0, 12) ?? "待生成"}</code></p>
            {inputReliability === "experimental" || inputReliability === "unknown" ? <small className="diagnostics-warning">当前输入 Gamma / Range 或 Log 技术还原未确认，预览可靠性有限。</small> : null}
            {!isPreviewCurrent && diagnostics !== undefined ? <small className="diagnostics-warning">参数、素材或输入解释已变化，请重新生成最终 Cube 预览。</small> : null}
            {!targetWasReanalyzed ? <small className="diagnostics-warning">目标素材尚未用自动分析重新生成参数；若参数不变，导出的 LUT 可能与上一版本完全相同。</small> : null}
          </div>
        ) : null}
      </div> : null}
    </section>
  );
};
