export type ProductExperienceMode = "quick" | "professional";

export type FootageAppearance = "log-flat" | "normal-color" | "unknown";

export type StyleAcquisitionMode = "reference" | "library" | "manual";

export type QuickIntensityPreset = "natural" | "standard" | "rich" | "full";

export type TargetEditor = "davinci-resolve" | "premiere-pro" | "final-cut-pro" | "camera-monitoring" | "other-cube";

export type TermOwnership = "website" | "davinci" | "camera" | "professional-diagnostics";

export interface QuickWorkflowPreferences {
  readonly footageAppearance: FootageAppearance;
  readonly styleAcquisitionMode: StyleAcquisitionMode;
  readonly intensityPreset: QuickIntensityPreset;
  readonly targetEditor: TargetEditor;
}

export interface ProductTermDefinition {
  readonly id: string;
  readonly term: string;
  readonly chineseName: string;
  readonly oneLineExplanation: string;
  readonly owner: TermOwnership;
  readonly userAction: string;
  readonly misconfigurationConsequence: string;
  readonly showInQuickMode: boolean;
}

export interface PostExportGuardInput {
  readonly footageAppearance: FootageAppearance;
  readonly hasVerifiedTechnicalTransform: boolean;
  readonly currentPixelsConfirmedRec709: boolean;
}

export interface PostExportGuard {
  readonly level: "ready" | "caution" | "blocked";
  readonly canExportPostLut: boolean;
  readonly title: string;
  readonly message: string;
  readonly nextAction: string;
}

export interface TargetEditorGuide {
  readonly editor: TargetEditor;
  readonly label: string;
  readonly location: string;
  readonly steps: readonly string[];
  readonly commonMistake: string;
}
