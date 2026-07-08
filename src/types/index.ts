export type RoutePath =
  | "/"
  | "/workspace"
  | "/photo-preset"
  | "/styles"
  | "/analysis"
  | "/history"
  | "/tutorial"
  | "/export";

export type StyleCategory =
  | "全部"
  | "电影感"
  | "人像摄影"
  | "城市夜景"
  | "复古胶片"
  | "商业广告"
  | "赛博风格";

export type ColorSpace = "Rec.709" | "S-Log3" | "D-Log M" | "C-Log3" | "V-Log" | "F-Log" | "不确定";

export type LutPrecision = "17x17x17" | "33x33x33" | "65x65x65";

export interface NavigationItem {
  readonly label: string;
  readonly path: RoutePath;
  readonly tooltip: string;
}

export interface LutStyle {
  readonly id: string;
  readonly name: string;
  readonly category: Exclude<StyleCategory, "全部">;
  readonly keywords: readonly string[];
  readonly suitableFor: string;
  readonly recommendedIntensity: number;
  readonly previewImage: string;
  readonly description: string;
}

export interface UploadedImage {
  readonly file: File;
  readonly url: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly width?: number;
  readonly height?: number;
}

export type MediaSourceType = "target" | "reference";

export type MediaOrigin = "upload" | "mock" | "style-library";

export interface MediaItem {
  readonly id: string;
  readonly sourceType: MediaSourceType;
  readonly file?: File;
  readonly url: string;
  readonly name: string;
  readonly size?: number;
  readonly type?: string;
  readonly width?: number;
  readonly height?: number;
  readonly createdAt: string;
  readonly origin: MediaOrigin;
}

export interface WorkspaceMediaState {
  readonly targetItems: readonly MediaItem[];
  readonly referenceItems: readonly MediaItem[];
  readonly activeTargetId?: string;
  readonly activeReferenceId?: string;
}

export interface ImageMetadataResult {
  readonly objectURL: string;
  readonly width?: number;
  readonly height?: number;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
}

export interface LutParameters {
  readonly intensity: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly temperature: number;
  readonly shadowMatch: number;
  readonly midtoneMatch: number;
  readonly highlightMatch: number;
  readonly tint: number;
  readonly inputColorSpace: ColorSpace;
  readonly precision: LutPrecision;
}

export interface GeneratePreviewParams {
  readonly targetFrameName: string;
  readonly referenceImageName: string;
  readonly selectedStyleName: string;
  readonly parameters: LutParameters;
}

export interface ColorPreviewAdjustments {
  readonly intensity: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly temperature: number;
  readonly tint: number;
  readonly shadowMatch: number;
  readonly midtoneMatch: number;
  readonly highlightMatch: number;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
}

export interface GenerateColorPreviewParams {
  readonly targetImageUrl: string;
  readonly referenceImageUrl?: string;
  readonly adjustments: ColorPreviewAdjustments;
  readonly maxSize?: number;
}

export interface ColorPreviewResult {
  readonly previewUrl: string;
  readonly width: number;
  readonly height: number;
}

export interface GenerateLocalPreviewParams {
  readonly targetImageUrl: string;
  readonly referenceImageUrl?: string;
  readonly selectedStyleName: string;
  readonly parameters: LutParameters;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
}

export interface PreviewResult {
  readonly id: string;
  readonly status: string;
  readonly styleName: string;
  readonly previewImage: string;
  readonly generatedAt: string;
  readonly width?: number;
  readonly height?: number;
  readonly isCanvasPreview?: boolean;
}

export interface ExportLutParams {
  readonly styleName: string;
  readonly parameters: LutParameters;
}

export interface ExportLutResult {
  readonly fileName: string;
  readonly fileSize: string;
  readonly precision: LutPrecision;
  readonly status: "导出已准备";
}

export interface PhotoPresetParams {
  readonly sourceImageName: string;
  readonly styleName: string;
  readonly intensity: number;
}

export interface PhotoPresetResult {
  readonly status: "图片预设已生成";
  readonly previewImage: string;
  readonly styleName: string;
}

export interface ColorAnalysisInput {
  readonly imageName: string;
}

export interface ColorSwatch {
  readonly name: string;
  readonly hex: string;
  readonly ratio: number;
}

export interface ColorAnalysisReport {
  readonly dominantColors: readonly ColorSwatch[];
  readonly temperature: "冷调" | "中性" | "暖调";
  readonly saturationLevel: "低饱和" | "中等饱和" | "高饱和";
  readonly contrastLevel: "柔和" | "标准" | "高反差";
  readonly keywords: readonly string[];
  readonly advice: string;
}

export interface ExportHistoryRecord {
  readonly id: string;
  readonly lutName: string;
  readonly styleName: string;
  readonly colorSpace: ColorSpace;
  readonly precision: LutPrecision;
  readonly createdAt: string;
  readonly status: "已导出" | "可重新生成";
}

export interface TutorialStep {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
}
