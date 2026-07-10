import { FileCheck2, FileInput, ShieldAlert, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import type { CameraLutRange, TechnicalTransformBinding } from "../../types";

interface TechnicalTransformStatusProps {
  readonly binding: TechnicalTransformBinding | null;
  readonly inputGamma: string;
  readonly inputGamut: string;
  readonly lookName: string;
  readonly monitorModeLabel: string;
  readonly range: CameraLutRange;
  readonly matchingAssetCount: number;
  readonly isImporting: boolean;
  readonly error: string;
  readonly warnings: readonly string[];
  readonly onFileSelected: (file: File) => Promise<void>;
  readonly onClear: () => void;
}

const getRangeLabel = (range: CameraLutRange): string => {
  if (range === "legal") {
    return "Legal Range";
  }

  return range === "full" ? "Full Range" : "自动 / 未知（当前按 Full）";
};

export const TechnicalTransformStatus = ({
  binding,
  inputGamma,
  inputGamut,
  lookName,
  monitorModeLabel,
  range,
  matchingAssetCount,
  isImporting,
  error,
  warnings,
  onFileSelected,
  onClear
}: TechnicalTransformStatusProps) => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file !== undefined) {
      void onFileSelected(file);
    }
  };

  return (
    <section className="technical-transform-status" aria-label="技术 LUT 转换链">
      <header>
        <div>
          {binding === null ? <ShieldAlert aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}
          <span>本地技术 LUT</span>
        </div>
        <strong className={binding?.verification === "verified-official" ? "verified" : "experimental"}>
          {binding === null
            ? "未绑定"
            : binding.verification === "verified-official"
              ? "官方文件已核验"
              : "用户文件 / 未核验"}
        </strong>
      </header>

      <div className="technical-transform-chain" aria-label="当前色彩处理顺序">
        <span>{inputGamma} / {inputGamut}</span>
        <i aria-hidden="true">→</i>
        <span className={binding === null ? "inactive" : "active"}>{binding?.fileName ?? "无技术转换"}</span>
        <i aria-hidden="true">→</i>
        <span>{lookName || "当前创意风格"}</span>
        <i aria-hidden="true">→</i>
        <span>{monitorModeLabel}</span>
        <i aria-hidden="true">→</i>
        <span>{getRangeLabel(range)}</span>
      </div>

      <div className="technical-transform-actions">
        <label className="technical-transform-file-button">
          <FileInput aria-hidden="true" />
          {isImporting ? "正在解析..." : binding === null ? "导入本地 .cube" : "替换本地 .cube"}
          <input accept=".cube,text/plain" disabled={isImporting} type="file" onChange={handleFileChange} />
        </label>
        {binding === null ? null : (
          <button aria-label="移除本地技术 LUT" disabled={isImporting} type="button" onClick={onClear}>
            <Trash2 aria-hidden="true" />
            移除
          </button>
        )}
      </div>

      <p className="technical-transform-note">
        {matchingAssetCount > 0
          ? `当前选择匹配 ${matchingAssetCount} 条厂商下载元数据。只有文件哈希与登记资料一致时才会标记为官方已核验。`
          : "当前选择没有匹配的厂商技术 LUT 元数据；可本地解析试用，但不会标记为官方已验证。"}
      </p>
      {binding === null ? null : (
        <dl className="technical-transform-metadata">
          <div><dt>标题</dt><dd>{binding.parsedLut.title ?? binding.fileName}</dd></div>
          <div><dt>点数</dt><dd>{binding.parsedLut.size}</dd></div>
          <div><dt>输出</dt><dd>{binding.outputSpace}</dd></div>
          <div><dt>SHA-256</dt><dd title={binding.sha256}>{binding.sha256.slice(0, 12)}...</dd></div>
        </dl>
      )}
      {error.length === 0 ? null : <p className="technical-transform-error" role="alert">{error}</p>}
      {warnings.length === 0 ? null : (
        <ul className="technical-transform-warnings">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </section>
  );
};
