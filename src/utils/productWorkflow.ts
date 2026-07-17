import { targetEditorGuides } from "../data/productGuidance";
import type { LutParameters } from "../types";
import type {
  FootageAppearance,
  PostExportGuard,
  PostExportGuardInput,
  ProductExperienceMode,
  QuickIntensityPreset,
  QuickWorkflowPreferences,
  StyleAcquisitionMode,
  TargetEditor,
  TargetEditorGuide
} from "../types/productWorkflow";

const footageAppearances: readonly FootageAppearance[] = ["log-flat", "normal-color", "unknown"];
const styleAcquisitionModes: readonly StyleAcquisitionMode[] = ["reference", "library", "manual"];
const quickIntensityPresets: readonly QuickIntensityPreset[] = ["natural", "standard", "rich", "full"];
const targetEditors: readonly TargetEditor[] = ["davinci-resolve", "premiere-pro", "final-cut-pro", "camera-monitoring", "other-cube"];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const readEnumValue = <T extends string>(value: unknown, values: readonly T[], fallback: T): T => {
  return typeof value === "string" && values.some((candidate) => candidate === value) ? values.find((candidate) => candidate === value) ?? fallback : fallback;
};

const readIntensityPreset = (value: unknown): QuickIntensityPreset => {
  if (typeof value === "number") {
    if (value === 35) return "natural";
    if (value === 50) return "standard";
    if (value === 70) return "rich";
    if (value === 100) return "full";
  }

  return readEnumValue(value, quickIntensityPresets, "standard");
};

export const createDefaultQuickWorkflowPreferences = (): QuickWorkflowPreferences => ({
  footageAppearance: "unknown",
  styleAcquisitionMode: "library",
  intensityPreset: "standard",
  targetEditor: "davinci-resolve"
});

export const migrateQuickWorkflowPreferences = (value: unknown): QuickWorkflowPreferences => {
  const defaults = createDefaultQuickWorkflowPreferences();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    footageAppearance: readEnumValue(value.footageAppearance, footageAppearances, defaults.footageAppearance),
    styleAcquisitionMode: readEnumValue(value.styleAcquisitionMode, styleAcquisitionModes, defaults.styleAcquisitionMode),
    intensityPreset: readIntensityPreset(value.intensityPreset),
    targetEditor: readEnumValue(value.targetEditor, targetEditors, defaults.targetEditor)
  };
};

export const applyExperienceModeToParameters = (_mode: ProductExperienceMode, parameters: LutParameters): LutParameters => ({ ...parameters });

export const resolveQuickIntensity = (preset: QuickIntensityPreset): 35 | 50 | 70 | 100 => {
  if (preset === "natural") return 35;
  if (preset === "standard") return 50;
  if (preset === "rich") return 70;
  return 100;
};

export const resolvePostExportGuard = (input: PostExportGuardInput): PostExportGuard => {
  if (input.footageAppearance === "log-flat" && !input.hasVerifiedTechnicalTransform && !input.currentPixelsConfirmedRec709) {
    return {
      level: "blocked",
      canExportPostLut: false,
      title: "请先完成技术还原",
      message: "当前素材看起来是 Log。POST 创意 LUT 不包含 Log 技术还原，直接导出会得到不可靠结果。",
      nextAction: "请先在 DaVinci 使用 CST 或项目色彩管理还原到 Rec.709 / Gamma 2.4，再上传静帧。"
    };
  }

  if (input.footageAppearance === "unknown" && !input.currentPixelsConfirmedRec709) {
    return {
      level: "caution",
      canExportPostLut: true,
      title: "输入状态未确认",
      message: "当前输入状态未确认，无法判断静帧是否已经是正常颜色。你可以继续实验，但不要把结果直接视为可靠的 Rec.709 POST LUT。",
      nextAction: "优先确认素材状态；不确定时先在剪辑软件中导出一张正常显示的 Rec.709 静帧。"
    };
  }

  return {
    level: "ready",
    canExportPostLut: true,
    title: "可以生成 POST 创意 LUT",
    message: "当前路径按 Rec.709 / Gamma 2.4 / Full 输入和输出处理。",
    nextAction: "完成预览后导出，并按目标软件的使用步骤加载。"
  };
};

export const getTargetEditorGuide = (editor: TargetEditor): TargetEditorGuide => targetEditorGuides[editor];
