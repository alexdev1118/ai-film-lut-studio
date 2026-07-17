import { BookOpen, Library, MonitorPlay, SlidersHorizontal, Sparkles, UploadCloud } from "lucide-react";
import type {
  FootageAppearance,
  PostExportGuard,
  ProductExperienceMode,
  QuickIntensityPreset,
  QuickWorkflowPreferences,
  StyleAcquisitionMode,
  TargetEditor
} from "../../types";
import { targetEditorGuides } from "../../data/productGuidance";
import { SelectControl } from "../ui/SelectControl";

interface QuickWorkflowPanelProps {
  readonly mode: ProductExperienceMode;
  readonly preferences: QuickWorkflowPreferences;
  readonly guard: PostExportGuard;
  readonly activeStyleName: string;
  readonly cameraSummary: string;
  readonly onModeChange: (mode: ProductExperienceMode) => void;
  readonly onPreferencesChange: (preferences: QuickWorkflowPreferences) => void;
  readonly onOpenStyleLibrary: () => void;
  readonly onGeneratePreview: () => void;
}

const footageOptions: readonly { readonly value: FootageAppearance; readonly label: string; readonly detail: string }[] = [
  { value: "log-flat", label: "灰、低对比", detail: "可能是 Log" },
  { value: "normal-color", label: "正常颜色", detail: "已还原素材" },
  { value: "unknown", label: "不确定", detail: "先走安全路径" }
];

const styleModeOptions: readonly { readonly value: StyleAcquisitionMode; readonly label: string }[] = [
  { value: "reference", label: "参考图片" },
  { value: "library", label: "风格库" },
  { value: "manual", label: "手动调节" }
];

const intensityOptions: readonly { readonly value: QuickIntensityPreset; readonly label: string; readonly detail: string }[] = [
  { value: "natural", label: "自然", detail: "35%" },
  { value: "standard", label: "标准", detail: "50%" },
  { value: "rich", label: "浓郁", detail: "70%" },
  { value: "full", label: "完整", detail: "100%" }
];

const editorOptions: readonly TargetEditor[] = ["davinci-resolve", "premiere-pro", "final-cut-pro", "camera-monitoring", "other-cube"];

export const QuickWorkflowPanel = ({
  mode,
  preferences,
  guard,
  activeStyleName,
  cameraSummary,
  onModeChange,
  onPreferencesChange,
  onOpenStyleLibrary,
  onGeneratePreview
}: QuickWorkflowPanelProps) => {
  const updatePreferences = <Key extends keyof QuickWorkflowPreferences>(key: Key, value: QuickWorkflowPreferences[Key]): void => {
    onPreferencesChange({ ...preferences, [key]: value });
  };

  return (
    <section className="quick-workflow-panel" aria-label="新手快速工作流">
      <header className="quick-workflow-header">
        <div>
          <span><Sparkles aria-hidden="true" /> 桌面工作流</span>
          <strong>{mode === "quick" ? "快速模式" : "专业模式"}</strong>
        </div>
        <div className="experience-mode-switch" aria-label="工作台模式">
          <button className={mode === "quick" ? "active" : ""} type="button" onClick={() => onModeChange("quick")}>快速</button>
          <button className={mode === "professional" ? "active" : ""} type="button" onClick={() => onModeChange("professional")}>专业</button>
        </div>
      </header>

      {mode === "quick" ? (
        <div className="quick-workflow-body">
          <div className="quick-workflow-step">
            <div className="quick-workflow-step-title"><UploadCloud aria-hidden="true" /><span><b>1</b> 素材现在看起来怎样？</span></div>
            <div className="quick-choice-grid three">
              {footageOptions.map((option) => (
                <button className={preferences.footageAppearance === option.value ? "active" : ""} key={option.value} type="button" onClick={() => updatePreferences("footageAppearance", option.value)}>
                  <strong>{option.label}</strong><small>{option.detail}</small>
                </button>
              ))}
            </div>
            <small className="quick-current-source">当前专业目录：{cameraSummary}</small>
          </div>

          <div className="quick-workflow-step">
            <div className="quick-workflow-step-title"><Library aria-hidden="true" /><span><b>2</b> 怎么获得风格？</span></div>
            <div className="quick-choice-grid three">
              {styleModeOptions.map((option) => (
                <button className={preferences.styleAcquisitionMode === option.value ? "active" : ""} key={option.value} type="button" onClick={() => updatePreferences("styleAcquisitionMode", option.value)}>{option.label}</button>
              ))}
            </div>
            {preferences.styleAcquisitionMode === "library" ? <button className="quick-inline-action" type="button" onClick={onOpenStyleLibrary}>当前：{activeStyleName} · 打开风格库</button> : null}
          </div>

          <div className="quick-workflow-step">
            <div className="quick-workflow-step-title"><SlidersHorizontal aria-hidden="true" /><span><b>3</b> 选择效果强度</span></div>
            <div className="quick-choice-grid four">
              {intensityOptions.map((option) => (
                <button className={preferences.intensityPreset === option.value ? "active" : ""} key={option.value} type="button" onClick={() => updatePreferences("intensityPreset", option.value)}>
                  <strong>{option.label}</strong><small>{option.detail}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="quick-workflow-step">
            <div className="quick-workflow-step-title"><MonitorPlay aria-hidden="true" /><span><b>4</b> 准备用在哪里？</span></div>
            <SelectControl
              options={editorOptions.map((editor) => ({
                value: editor,
                label: targetEditorGuides[editor].label,
                description: targetEditorGuides[editor].location
              }))}
              value={preferences.targetEditor}
              onChange={(value) => {
                const editor = editorOptions.find((candidate) => candidate === value);
                if (editor !== undefined) updatePreferences("targetEditor", editor);
              }}
            />
          </div>

          <div className={`quick-export-guard ${guard.level}`}>
            <BookOpen aria-hidden="true" />
            <div><strong>{guard.title}</strong><p>{guard.message}</p><small>{guard.nextAction}</small></div>
          </div>

          <button className="quick-generate-button" type="button" onClick={onGeneratePreview}>
            <Sparkles aria-hidden="true" />生成当前预览
          </button>
        </div>
      ) : (
        <p className="professional-mode-note">专业模式保留输入 Profile、Gamma / Gamut、Cube 契约、Hash、Round-Trip 与相机监看设置，并继续共用当前参数与 LUT Core。</p>
      )}
    </section>
  );
};
