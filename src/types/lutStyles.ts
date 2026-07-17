export type LutStyleCategory =
  | "全部"
  | "电影感"
  | "人像"
  | "商业"
  | "纪录片"
  | "美食"
  | "旅行"
  | "夜景"
  | "复古"
  | "黑白"
  | "实验性";

export type LutStyleProvenanceType =
  | "verified-official-technical"
  | "verified-open-creative"
  | "original-authored"
  | "inspired-by-public-characteristics"
  | "experimental";

export type LutStyleRiskLevel = "low" | "medium" | "high";
export type LutStyleStrength = 35 | 50 | 70 | 100;

export interface LutStyleAdjustments {
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

export interface LutStyleProvenance {
  readonly type: LutStyleProvenanceType;
  readonly author: string;
  readonly statement: string;
  readonly sourceUrls: readonly string[];
}

export interface LutStyleLicense {
  readonly identifier: "PROJECT-ORIGINAL-V1";
  readonly owner: string;
  readonly redistributionAllowed: boolean;
  readonly attributionRequired: boolean;
  readonly statement: string;
}

export interface LutStyleCompatibility {
  readonly inputContract: "bt709-g24-full";
  readonly outputContract: "bt709-g24-full";
  readonly cubeSizes: readonly [17, 33, 65];
  readonly strengths: readonly [LutStyleStrength, LutStyleStrength, LutStyleStrength, LutStyleStrength];
  readonly technicalConversionIncluded: false;
}

export interface LutStyleRiskProfile {
  readonly level: LutStyleRiskLevel;
  readonly risks: readonly string[];
  readonly safeguards: readonly string[];
}

export interface LutStylePreviewSet {
  readonly generatedLocally: true;
  readonly generatedFromFinalCube: true;
  readonly cacheKey: string;
  readonly calibration: string;
  readonly portrait: string;
  readonly skyGreenery: string;
  readonly saturatedRed: string;
  readonly scenes: readonly LutStyleScenePreview[];
}

export interface LutStyleScenePreview {
  readonly sceneId:
    | "portrait-normal"
    | "portrait-close"
    | "blue-sky"
    | "blue-sky-greenery"
    | "daylight-high-contrast"
    | "saturated-red";
  readonly label: string;
  readonly image: string;
  readonly strength: LutStyleStrength;
  readonly source: "procedural-stress-fixture";
}

export interface LutStyleValidationSummary {
  readonly proceduralSixScenesPassed: boolean;
  readonly monotonicStrengthPassed: boolean;
  readonly supportedCubeSizesValidated: readonly [17, 33, 65];
  readonly realDavinciStatus: "shared-core-validated" | "style-specific-pending";
  readonly validationVersion: string;
}

export interface LutStyleDefinition {
  readonly id: string;
  readonly name: string;
  readonly englishName: string;
  readonly category: Exclude<LutStyleCategory, "全部">;
  readonly keywords: readonly string[];
  readonly suitableFor: string;
  readonly recommendedIntensity: LutStyleStrength;
  readonly previewImage: string;
  readonly description: string;
  readonly adjustments: LutStyleAdjustments;
  readonly provenance: LutStyleProvenance;
  readonly license: LutStyleLicense;
  readonly compatibility: LutStyleCompatibility;
  readonly riskProfile: LutStyleRiskProfile;
  readonly previewSet: LutStylePreviewSet;
  readonly validation: LutStyleValidationSummary;
  readonly version: string;
}
