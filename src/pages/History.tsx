import { exportHistoryRecords } from "../data/history";
import { GlassCard } from "../components/ui/GlassCard";
import { useWorkspaceState } from "../state/WorkspaceContext";
import type { ExportHistoryRecord, LutPrecision } from "../types";

const getPrecisionFromSize = (lutSize: number): LutPrecision => {
  if (lutSize === 17) {
    return "17x17x17";
  }

  return lutSize === 65 ? "65x65x65" : "33x33x33";
};

export const History = () => {
  const { lastExportResult, lutName, parameters } = useWorkspaceState();
  const currentExport: ExportHistoryRecord | null =
    lastExportResult === null
      ? null
      : {
          id: `session-${lastExportResult.fileName}`,
          lutName: lastExportResult.lookName ?? lutName,
          fileName: lastExportResult.fileName,
          styleName: lastExportResult.lookName ?? lutName,
          colorSpace: "Rec.709",
          precision: getPrecisionFromSize(lastExportResult.lutSize),
          inputType: lastExportResult.outputColorSpace ?? "Rec.709",
          cameraBrand: lastExportResult.sourceHintBrand ?? "Generic",
          gamma: lastExportResult.sourceHintGamma ?? "Rec.709",
          gamut: "Metadata hint",
          lutType: lastExportResult.exportKind === "camera-monitoring" ? "相机监看 LUT" : "后期软件创意 LUT",
          exportKind: lastExportResult.exportKind ?? "post-creative",
          exportTypeCode: lastExportResult.exportTypeCode ?? "POST",
          lookName: lastExportResult.lookName ?? lutName,
          outputColorSpace: lastExportResult.outputColorSpace ?? "Rec.709",
          sourceHintBrand: lastExportResult.sourceHintBrand,
          sourceHintGamma: lastExportResult.sourceHintGamma,
          verificationStatus: lastExportResult.verificationStatus,
          workflowSummary: lastExportResult.exportKind === "camera-monitoring" ? "相机监看测试，需按机型继续核验。" : "先完成技术转换，再作为创意 Look 使用。",
          styleIntensity: parameters.intensity,
          passedValidation: lastExportResult.isValid ?? false,
          dataLineCount: lastExportResult.dataLineCount ?? 0,
          createdAt: "当前会话",
          status: "已导出"
        };
  const records = currentExport === null ? exportHistoryRecords : [currentExport, ...exportHistoryRecords];

  return (
    <div className="stack-page">
      <header className="page-header">
        <p className="eyebrow">导出记录</p>
        <h1>历史 LUT 导出</h1>
        <p>这里展示当前会话可扩展的 LUT 记录结构，后续可替换为本地项目历史或云端“我的 LUT 库”。</p>
      </header>
      <GlassCard>
        <div className="history-table">
          <div className="history-row history-head">
            <span>文件名</span>
            <span>类型</span>
            <span>相机 / Gamma</span>
            <span>输入假设</span>
            <span>精度</span>
            <span>数据行</span>
            <span>校验</span>
            <span>时间</span>
          </div>
          {records.map((record) => (
            <div className="history-row" key={record.id}>
              <span>{record.fileName}</span>
              <span><strong className="export-type-code">{record.exportTypeCode}</strong> {record.lutType}{record.verificationStatus === "TEST" ? " / TEST" : ""}</span>
              <span>
                {record.cameraBrand} / {record.gamma}
              </span>
              <span>{record.inputType}</span>
              <span>{record.precision}</span>
              <span>{record.dataLineCount}</span>
              <span>{record.passedValidation ? "通过" : "未通过"}</span>
              <span>{record.createdAt}</span>
            </div>
          ))}
        </div>
        <p className="muted-copy">
          当前导出的是基础创意风格 LUT，适合 Rec.709 / 已还原素材的风格测试，不是 Sony S-Log3、Canon C-Log、DJI D-Log 等相机 Log 的技术转换 LUT。
        </p>
        <p className="muted-copy">记录结构已预留 Gamut、输入类型、推荐工作流和校验状态，后续可接入本地会话保存或“我的 LUT 库”。</p>
      </GlassCard>
    </div>
  );
};
