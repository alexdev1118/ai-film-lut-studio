import { useState } from "react";
import { analyzeColorMock } from "../services/lutService";
import { colorAnalysisReport } from "../data/analysis";
import type { ColorAnalysisReport as ColorAnalysisReportType } from "../types";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { UploadPanel } from "../components/ui/UploadPanel";

export const ColorAnalysis = () => {
  const [imageName, setImageName] = useState("night-street-frame.jpg");
  const [report, setReport] = useState<ColorAnalysisReportType>(colorAnalysisReport);
  const [message, setMessage] = useState("当前结果为示例数据。");

  const handleAnalyze = async () => {
    try {
      setMessage("正在刷新示例分析数据...");
      const nextReport = await analyzeColorMock({ imageName });
      setReport(nextReport);
      setMessage("示例色彩分析报告已更新，当前尚未接入真实图片分析。");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "色彩分析时发生未知错误。";
      setMessage(errorMessage);
    }
  };

  return (
    <div className="stack-page">
      <header className="page-header">
        <p className="eyebrow">色彩分析</p>
        <h1>示例色彩分析报告</h1>
        <p>当前为示例分析页面，真实色彩分析功能尚未接入。</p>
      </header>
      <div className="analysis-mock-notice glass-card">
        <strong>当前结果为示例数据</strong>
        <span>{message} 后续真实开发可基于 Canvas 读取平均色、直方图、明暗分布等信息。</span>
      </div>
      <GlassCard>
        <UploadPanel
          description="当前只更新示例文件名，不会真实分析图片"
          fileName={imageName}
          title="示例分析图片"
          onFileNameChange={setImageName}
        />
        <Button onClick={handleAnalyze}>刷新示例分析</Button>
      </GlassCard>
      <div className="analysis-grid">
        <GlassCard>
          <h2>主色分布</h2>
          <div className="swatch-list">
            {report.dominantColors.map((color) => (
              <div className="swatch-item" key={color.hex}>
                <span className="swatch" style={{ backgroundColor: color.hex }} />
                <span>{color.name}</span>
                <strong>{color.ratio}%</strong>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard>
          <h2>影调判断</h2>
          <p>冷暖倾向：{report.temperature}</p>
          <p>饱和度：{report.saturationLevel}</p>
          <p>对比度：{report.contrastLevel}</p>
          <div className="tag-row">
            {report.keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
          <p className="status-line">{report.advice}</p>
        </GlassCard>
      </div>
    </div>
  );
};
