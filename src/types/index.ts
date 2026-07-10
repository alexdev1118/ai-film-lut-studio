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

export type CameraBrand =
  | "generic"
  | "sony"
  | "canon"
  | "dji"
  | "panasonic"
  | "fujifilm"
  | "nikon"
  | "blackmagic"
  | "gopro"
  | "apple"
  | "arri"
  | "red"
  | "kinefinity"
  | "zcam"
  | "leica"
  | "sigma"
  | "insta360"
  | "olympus"
  | "ricoh"
  | "unknown";

export type InputType = "rec709" | "log" | "hdr" | "flat" | "unknown";

export type CameraProfileCategory = "mirrorless" | "cinema" | "drone" | "action" | "mobile" | "generic" | "unknown";

export type CameraProfileDataStatus = "built-in" | "placeholder" | "needs-official-confirmation";

export type CameraProfileSourceStatus = "official-needed" | "community-reference" | "user-confirmed" | "unknown";

export type SensorFormat = "full-frame" | "aps-c" | "mft" | "s35" | "medium-format" | "1-inch" | "unknown";

export type CameraLutUseType = "monitoring" | "recording" | "monitoring-and-recording" | "unknown";

export type CameraLutFormat = ".cube" | ".vlt" | ".aml" | ".look" | "unknown";

export type CameraLutCubeSize = 17 | 33 | 65;

export type CameraLutRange = "full" | "legal" | "unknown";

export type CameraLutDataStatus = "verified-official" | "placeholder" | "needs-official-confirmation";

export type LutExportKind = "post-creative" | "camera-monitoring" | "camera-baked" | "technical-conversion";

export type LutExportTypeCode = "POST" | "CAMMON";

export type PostLutNamingMode = "simple" | "full";

export type CameraDataSourceType =
  | "official-manual"
  | "official-support-page"
  | "official-lut-download"
  | "official-white-paper"
  | "official-firmware-note"
  | "community-test"
  | "user-feedback"
  | "internal-assumption";

export type CameraDataVerificationStatus = "verified" | "partially-verified" | "conflicting" | "unverified";

export type CameraVerifiedFactCategory =
  | "lut-format"
  | "lut-size"
  | "lut-slots"
  | "import-path"
  | "monitoring-only"
  | "baked-recording"
  | "gamma"
  | "gamut"
  | "native-iso"
  | "cine-ei"
  | "zebra"
  | "middle-gray"
  | "white-clip"
  | "range"
  | "exposure-guidance"
  | "firmware"
  | "other";

export type CameraDataConfidenceLevel = "official-confirmed" | "official-incomplete" | "community-consensus" | "experimental" | "unknown";

export type MonitoringExposureOffset = "0" | "+1" | "+2" | "+3" | "custom";

export type CameraMonitoringMode = "standard" | "ettr-normalization" | "manual-brightness-offset";

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

export interface CameraProfile {
  readonly id: string;
  readonly brandId: CameraBrand;
  readonly brand: string;
  readonly brandLabel: string;
  readonly modelFamily?: string;
  readonly label: string;
  readonly gamma: string;
  readonly gamut: string;
  readonly inputType: InputType;
  readonly category: CameraProfileCategory;
  readonly recommendedWorkflow: string;
  readonly canUseDirectly: boolean;
  readonly warning: string;
  readonly davinciTip: string;
  readonly premiereTip?: string;
  readonly finalCutTip?: string;
  readonly exportNote: string;
  readonly dataStatus: CameraProfileDataStatus;
  readonly sourceStatus?: CameraProfileSourceStatus;
}

export interface CameraLutExposureTools {
  readonly supportsEiMetadata?: boolean | "unknown";
  readonly supportsExposureOffset?: boolean | "unknown";
  readonly exposureOffsetLabel?: string;
  readonly notes?: string;
}

export interface CameraLutSupportProfile {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly brandLabel: string;
  readonly modelName: string;
  readonly modelFamily: string;
  readonly sensorFormat?: SensorFormat;
  readonly supported: boolean | "unknown";
  readonly lutUseType: CameraLutUseType;
  readonly supportedFormats: readonly CameraLutFormat[];
  readonly maxCubeSize?: CameraLutCubeSize | "unknown";
  readonly recommendedCubeSize?: CameraLutCubeSize;
  readonly range?: CameraLutRange;
  readonly importMethod?: string;
  readonly fileNameRules?: string;
  readonly maxSlots?: number | "unknown";
  readonly supportedLogProfiles: readonly string[];
  readonly supportedGamuts: readonly string[];
  readonly exposureTools?: CameraLutExposureTools;
  readonly monitoringNotes: string;
  readonly warning: string;
  readonly dataStatus: CameraLutDataStatus;
  readonly sourceIds?: readonly string[];
  readonly verifiedFactIds?: readonly string[];
  readonly lastVerifiedAt?: string;
  readonly firmwareScope?: readonly string[];
  readonly confidenceLevel: CameraDataConfidenceLevel;
  readonly officialSourceNeeded: boolean;
  readonly sourceNotes?: string;
}

export interface CameraExposureGuide {
  readonly cameraModel: string;
  readonly sensorFormat: SensorFormat;
  readonly logProfile: string;
  readonly nativeIso?: string;
  readonly recommendedEttr?: string;
  readonly zebraMiddleGray?: string;
  readonly zebraSkinTone?: string;
  readonly whiteClipIre?: string;
  readonly notes: string;
  readonly dataStatus: CameraLutDataStatus;
  readonly sourceIds?: readonly string[];
  readonly verifiedFactIds?: readonly string[];
  readonly lastVerifiedAt?: string;
  readonly firmwareScope?: readonly string[];
  readonly confidenceLevel: CameraDataConfidenceLevel;
  readonly sourceNeeded: boolean;
}

export interface CameraDataSource {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly model: string;
  readonly documentTitle: string;
  readonly sourceType: CameraDataSourceType;
  readonly url?: string;
  readonly documentVersion?: string;
  readonly firmwareVersion?: string;
  readonly language?: string;
  readonly pageNumber?: string;
  readonly section?: string;
  readonly retrievedAt?: string;
  readonly verifiedAt?: string;
  readonly verificationStatus: CameraDataVerificationStatus;
  readonly notes?: string;
}

export interface CameraVerifiedFact {
  readonly id: string;
  readonly brand: CameraBrand;
  readonly model: string;
  readonly category: CameraVerifiedFactCategory;
  readonly field: string;
  readonly value: string;
  readonly unit?: string;
  readonly sourceIds: readonly string[];
  readonly confidence: CameraDataConfidenceLevel;
  readonly appliesToFirmware?: readonly string[];
  readonly lastVerifiedAt?: string;
  readonly notes?: string;
}

export interface CameraMonitoringExposureConfig {
  readonly mode: CameraMonitoringMode;
  readonly shootingTargetEv?: number;
  readonly lutBrightnessOffsetEv: number;
}

export interface InputColorConfig {
  readonly brandId: CameraBrand;
  readonly brand?: string;
  readonly brandLabel?: string;
  readonly profileId: string;
  readonly inputType: InputType;
  readonly category?: CameraProfileCategory;
  readonly gamma?: string;
  readonly gamut?: string;
  readonly recommendedWorkflow: string;
  readonly canUseCreativeLutDirectly: boolean;
  readonly dataStatus?: CameraProfileDataStatus;
  readonly sourceStatus?: CameraProfileSourceStatus;
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

export type MediaOrigin = "upload" | "mock" | "style-library" | "video-frame";

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

export interface VideoSource {
  readonly file: File;
  readonly url: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly duration: number;
  readonly width: number;
  readonly height: number;
}

export interface CapturedFrame {
  readonly url: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly sourceVideoName: string;
  readonly timestamp: number;
  readonly size: number;
  readonly type: string;
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

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
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

export interface LutExportOptions {
  readonly lutName: string;
  readonly lookName?: string;
  readonly lutSize: number;
  readonly adjustments: ColorPreviewAdjustments;
  readonly referenceAverageColor?: RgbColor;
  readonly inputColorConfig?: InputColorConfig;
}

export interface CameraLutExportOptions {
  readonly lutName: string;
  readonly profile: CameraLutSupportProfile;
  readonly requestedCubeSize: CameraLutCubeSize | "auto";
  readonly selectedLogProfile: string;
  readonly selectedGamut: string;
  readonly lutUseType: CameraLutUseType;
  readonly range: CameraLutRange;
  readonly exposureConfig: CameraMonitoringExposureConfig;
  readonly adjustments: ColorPreviewAdjustments;
  readonly referenceAverageColor?: RgbColor;
}

export interface CameraMonitoringLutExportParams {
  readonly lutName: string;
  readonly profile: CameraLutSupportProfile;
  readonly requestedCubeSize: CameraLutCubeSize | "auto";
  readonly selectedLogProfile: string;
  readonly selectedGamut: string;
  readonly lutUseType: CameraLutUseType;
  readonly range: CameraLutRange;
  readonly exposureConfig: CameraMonitoringExposureConfig;
  readonly parameters: LutParameters;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
  readonly referenceImageUrl?: string;
  readonly referenceAverageColor?: RgbColor;
}

export interface CameraLutExportResult extends CubeExportResult {
  readonly exportType: "camera-monitoring";
  readonly exportKind: "camera-monitoring";
  readonly exportTypeCode: "CAMMON";
  readonly verificationStatus: "TEST" | "verified";
  readonly cameraBrand: string;
  readonly cameraModel: string;
  readonly gamma: string;
  readonly gamut: string;
  readonly range: CameraLutRange;
  readonly exposureConfig: CameraMonitoringExposureConfig;
  readonly dataStatus: CameraLutDataStatus;
}

export interface CubeExportResult {
  readonly fileName: string;
  readonly content: string;
  readonly lutSize: number;
  readonly exportKind?: LutExportKind;
  readonly exportTypeCode?: LutExportTypeCode;
  readonly lookName?: string;
  readonly outputColorSpace?: string;
  readonly sourceHintBrand?: string;
  readonly sourceHintGamma?: string;
  readonly verificationStatus?: "TEST" | "verified";
  readonly dataLineCount?: number;
  readonly isValid?: boolean;
  readonly validationErrors?: readonly string[];
  readonly validationWarnings?: readonly string[];
}

export interface ExportCubeLutParams {
  readonly lutName: string;
  readonly lookName: string;
  readonly lutSize: number;
  readonly parameters: LutParameters;
  readonly skinToneProtection: boolean;
  readonly preserveLuma: boolean;
  readonly preventOversaturation: boolean;
  readonly referenceImageUrl?: string;
  readonly referenceAverageColor?: RgbColor;
  readonly inputColorConfig?: InputColorConfig;
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
  readonly fileName: string;
  readonly styleName: string;
  readonly colorSpace: ColorSpace;
  readonly precision: LutPrecision;
  readonly inputType: string;
  readonly cameraBrand: string;
  readonly gamma: string;
  readonly gamut: string;
  readonly lutType: string;
  readonly exportKind: LutExportKind;
  readonly exportTypeCode: LutExportTypeCode;
  readonly lookName: string;
  readonly outputColorSpace: string;
  readonly sourceHintBrand?: string;
  readonly sourceHintGamma?: string;
  readonly verificationStatus?: "TEST" | "verified";
  readonly workflowSummary: string;
  readonly styleIntensity: number;
  readonly passedValidation: boolean;
  readonly dataLineCount: number;
  readonly createdAt: string;
  readonly status: "已导出" | "可重新生成";
}

export interface TutorialStep {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly details: readonly string[];
}
