import type { PreviewResult } from "../../types";
import { GlassCard } from "../ui/GlassCard";

interface BeforeAfterPreviewProps {
  readonly result: PreviewResult | null;
  readonly isLoading: boolean;
}

export const BeforeAfterPreview = ({ result, isLoading }: BeforeAfterPreviewProps) => {
  return (
    <GlassCard className="preview-card">
      <div className="preview-header">
        <div>
          <p className="eyebrow">实时预览</p>
          <h2>原图 / 效果图</h2>
        </div>
        <span className={result === null ? "status-pill muted" : "status-pill"}>{result?.status ?? "等待生成"}</span>
      </div>
      <div className="before-after-grid">
        <div className="image-preview original-preview">
          <span>原图</span>
        </div>
        <div className="image-preview result-preview" style={{ background: result?.previewImage }}>
          <span>{isLoading ? "AI 正在分析参考图色彩、影调与对比度..." : "效果图"}</span>
        </div>
      </div>
    </GlassCard>
  );
};
