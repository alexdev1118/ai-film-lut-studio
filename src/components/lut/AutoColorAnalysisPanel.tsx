import { RotateCcw, ScanLine, ShieldAlert, Sparkles } from "lucide-react";
import type { AutoColorAnalysisResult, AutoColorSuggestion, LutValidationSceneId } from "../../types";
import { validationScenes } from "../../data/validationScenes";
import { SelectControl } from "../ui/SelectControl";

interface AutoColorAnalysisPanelProps {
  readonly sceneId: LutValidationSceneId;
  readonly analysis: AutoColorAnalysisResult | null;
  readonly suggestion: AutoColorSuggestion | null;
  readonly isAnalyzing: boolean;
  readonly canRestore: boolean;
  readonly onSceneChange: (sceneId: LutValidationSceneId) => void;
  readonly onAnalyze: () => void;
  readonly onApply: () => void;
  readonly onRestore: () => void;
}

const confidenceLabel = (confidence: AutoColorAnalysisResult["confidence"]): string => {
  if (confidence === "high") {
    return "高";
  }

  return confidence === "medium" ? "中" : "低";
};

const readinessLabel = (readiness: AutoColorAnalysisResult["readiness"]): string => {
  if (readiness === "ready") {
    return "可用于创意仿色";
  }

  return readiness === "experimental-log" ? "Log 实验性预览" : "输入状态未确认";
};

const signed = (value: number): string => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;

export const AutoColorAnalysisPanel = ({
  sceneId,
  analysis,
  suggestion,
  isAnalyzing,
  canRestore,
  onSceneChange,
  onAnalyze,
  onApply,
  onRestore
}: AutoColorAnalysisPanelProps) => {
  return (
    <section className="auto-color-analysis" aria-label="自动仿色分析">
      <div className="auto-color-analysis-heading">
        <div>
          <ScanLine aria-hidden="true" />
          <span>自动仿色分析</span>
        </div>
        <small>本地色彩统计</small>
      </div>
      <SelectControl
        label="验证场景"
        options={validationScenes.map((scene) => ({ value: scene.id, label: scene.label, description: scene.description }))}
        value={sceneId}
        onChange={(value) => {
          const selectedScene = validationScenes.find((scene) => scene.id === value);
          if (selectedScene !== undefined) {
            onSceneChange(selectedScene.id);
          }
        }}
      />
      <button className="analysis-run-button" disabled={isAnalyzing} type="button" onClick={onAnalyze}>
        <Sparkles aria-hidden="true" />
        {isAnalyzing ? "正在分析本地像素" : "分析并生成建议"}
      </button>

      {analysis === null ? (
        <p className="analysis-disclosure">基于本地像素统计生成建议，不使用深度学习模型，也不会自动覆盖当前参数。</p>
      ) : (
        <div className="analysis-result">
          <div className={`analysis-readiness ${analysis.readiness === "ready" ? "ready" : "caution"}`}>
            {analysis.readiness === "ready" ? <ScanLine aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
            <span>{readinessLabel(analysis.readiness)} / 可信度：{confidenceLabel(analysis.confidence)}</span>
          </div>
          <p>{analysis.inputSummary}</p>
          <dl>
            <div><dt>曝光差异</dt><dd>{signed(analysis.exposureDifference)}</dd></div>
            <div><dt>冷暖差异</dt><dd>{signed(analysis.temperatureDifference)}</dd></div>
            <div><dt>饱和度差异</dt><dd>{signed(analysis.saturationDifference)}</dd></div>
          </dl>
          {suggestion === null ? null : (
            <>
              <div className="analysis-suggestion-grid">
                <span>强度 {suggestion.parameters.intensity}</span>
                <span>对比 {suggestion.parameters.contrast}</span>
                <span>饱和 {suggestion.parameters.saturation}</span>
                <span>色温 {suggestion.parameters.temperature}</span>
                <span>Tint {suggestion.parameters.tint}</span>
              </div>
              <div className="analysis-actions">
                <button type="button" onClick={onApply}>应用自动建议</button>
                {canRestore ? (
                  <button className="analysis-restore-button" type="button" onClick={onRestore}>
                    <RotateCcw aria-hidden="true" />
                    恢复分析前参数
                  </button>
                ) : null}
              </div>
            </>
          )}
          {analysis.risks.length === 0 ? null : (
            <ul className="analysis-risk-list">
              {analysis.risks.map((risk) => <li key={risk}>{risk}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
