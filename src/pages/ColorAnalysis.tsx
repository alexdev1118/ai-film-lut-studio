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
  const [message, setMessage] = useState("已加载示例色彩分析报告。");

  const handleAnalyze = async () => {
    try {
      setMessage("正在模拟分析主色、冷暖倾向与饱和度...");
      const nextReport = await analyzeColorMock({ imageName });
      setReport(nextReport);
      setMessage("色彩分析报告已更新。");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "色彩分析时发生未知错误。";
      setMessage(errorMessage);
    }
  };

  return (
    <div className="stack-page">
      <header className="page-header">
        <p className="eyebrow">色彩分析</p>
        <h1>mock 色彩分析报告</h1>
        <p>{message}</p>
      </header>
      <GlassCard>
        <UploadPanel
          description="选择一张静帧用于模拟分析"
          fileName={imageName}
          title="拖拽或点击上传分析图片"
          onFileNameChange={setImageName}
        />
        <Button onClick={handleAnalyze}>分析色彩</Button>
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
