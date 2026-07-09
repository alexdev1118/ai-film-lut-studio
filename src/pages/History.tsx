import { exportHistoryRecords } from "../data/history";
import { GlassCard } from "../components/ui/GlassCard";

export const History = () => {
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
          {exportHistoryRecords.map((record) => (
            <div className="history-row" key={record.id}>
              <span>{record.fileName}</span>
              <span>{record.lutType}</span>
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
