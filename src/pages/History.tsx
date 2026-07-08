import { exportHistoryRecords } from "../data/history";
import { GlassCard } from "../components/ui/GlassCard";

export const History = () => {
  return (
    <div className="stack-page">
      <header className="page-header">
        <p className="eyebrow">导出记录</p>
        <h1>历史 LUT 导出</h1>
        <p>这里展示 mock 导出记录，后续可替换为真实账户或本地项目历史。</p>
      </header>
      <GlassCard>
        <div className="history-table">
          <div className="history-row history-head">
            <span>文件名</span>
            <span>风格</span>
            <span>色彩空间</span>
            <span>精度</span>
            <span>时间</span>
            <span>状态</span>
          </div>
          {exportHistoryRecords.map((record) => (
            <div className="history-row" key={record.id}>
              <span>{record.lutName}</span>
              <span>{record.styleName}</span>
              <span>{record.colorSpace}</span>
              <span>{record.precision}</span>
              <span>{record.createdAt}</span>
              <span>{record.status}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
