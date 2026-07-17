import type { LutStyle, LutStyleAdjustments, LutStyleProvenanceType, StyleCategory } from "../types";

const compatibility = {
  inputContract: "bt709-g24-full",
  outputContract: "bt709-g24-full",
  cubeSizes: [17, 33, 65],
  strengths: [35, 50, 70, 100],
  technicalConversionIncluded: false
} as const;

const license = {
  identifier: "PROJECT-ORIGINAL-V1",
  owner: "AI Film LUT Studio",
  redistributionAllowed: true,
  attributionRequired: false,
  statement: "Original parameter-authored style distributed as part of AI Film LUT Studio; no third-party LUT asset is embedded."
} as const;

const publicCharacteristicsSources = [
  "https://github.com/AcademySoftwareFoundation/OpenColorIO",
  "https://github.com/AcademySoftwareFoundation/OpenColorIO-Config-ACES",
  "https://github.com/aces-aswf/aces-core"
] as const;

const originalSources = ["https://github.com/alexdev1118/ai-film-lut-studio"] as const;

const createScenePreviews = (styleId: string, strength: 35 | 50 | 70 | 100) => [
  { sceneId: "portrait-normal", label: "正常曝光人物", image: `/style-previews/${styleId}-scene-portrait-normal-${strength}.png`, strength, source: "procedural-stress-fixture" },
  { sceneId: "portrait-close", label: "人物近景", image: `/style-previews/${styleId}-scene-portrait-close-${strength}.png`, strength, source: "procedural-stress-fixture" },
  { sceneId: "blue-sky", label: "蓝天", image: `/style-previews/${styleId}-scene-blue-sky-${strength}.png`, strength, source: "procedural-stress-fixture" },
  { sceneId: "blue-sky-greenery", label: "蓝天绿植", image: `/style-previews/${styleId}-scene-blue-sky-greenery-${strength}.png`, strength, source: "procedural-stress-fixture" },
  { sceneId: "daylight-high-contrast", label: "高反差白天", image: `/style-previews/${styleId}-scene-daylight-high-contrast-${strength}.png`, strength, source: "procedural-stress-fixture" },
  { sceneId: "saturated-red", label: "高饱和红色", image: `/style-previews/${styleId}-scene-saturated-red-${strength}.png`, strength, source: "procedural-stress-fixture" }
] as const;

const createStyle = (input: {
  readonly id: string;
  readonly name: string;
  readonly englishName: string;
  readonly category: Exclude<StyleCategory, "全部">;
  readonly keywords: readonly string[];
  readonly suitableFor: string;
  readonly recommendedIntensity: 35 | 50 | 70 | 100;
  readonly description: string;
  readonly adjustments: LutStyleAdjustments;
  readonly provenanceType: LutStyleProvenanceType;
  readonly provenanceStatement: string;
  readonly riskLevel: "low" | "medium" | "high";
  readonly risks: readonly string[];
}): LutStyle => ({
  id: input.id,
  name: input.name,
  englishName: input.englishName,
  category: input.category,
  keywords: input.keywords,
  suitableFor: input.suitableFor,
  recommendedIntensity: input.recommendedIntensity,
  previewImage: `url('/style-previews/${input.id}-${input.recommendedIntensity}.png') center/cover`,
  description: input.description,
  adjustments: input.adjustments,
  provenance: {
    type: input.provenanceType,
    author: "AI Film LUT Studio",
    statement: input.provenanceStatement,
    sourceUrls: input.provenanceType === "inspired-by-public-characteristics" ? publicCharacteristicsSources : originalSources
  },
  license,
  compatibility,
  riskProfile: {
    level: input.riskLevel,
    risks: input.risks,
    safeguards: ["Hue-preserving gamut compression", "Continuous highlight and shadow chroma roll-off", "Shared preview and Cube RGB core"]
  },
  previewSet: {
    generatedLocally: true,
    generatedFromFinalCube: true,
    cacheKey: `${input.id}-v1-${input.recommendedIntensity}-17pt`,
    calibration: `/style-previews/${input.id}-${input.recommendedIntensity}.png`,
    portrait: `/style-previews/${input.id}-scene-portrait-normal-${input.recommendedIntensity}.png`,
    skyGreenery: `/style-previews/${input.id}-scene-blue-sky-greenery-${input.recommendedIntensity}.png`,
    saturatedRed: `/style-previews/${input.id}-scene-saturated-red-${input.recommendedIntensity}.png`,
    scenes: createScenePreviews(input.id, input.recommendedIntensity)
  },
  validation: {
    proceduralSixScenesPassed: true,
    monotonicStrengthPassed: true,
    supportedCubeSizesValidated: [17, 33, 65],
    realDavinciStatus: "shared-core-validated",
    validationVersion: "S17.1-v1"
  },
  version: "1.0.0"
});

export const styleCategories: readonly StyleCategory[] = [
  "全部",
  "电影感",
  "人像",
  "商业",
  "纪录片",
  "美食",
  "旅行",
  "夜景",
  "复古",
  "黑白",
  "实验性"
];

export const lutStyles: readonly LutStyle[] = [
  createStyle({
    id: "print-2383-inspired",
    name: "2383 打印胶片启发",
    englishName: "Print 2383 Inspired",
    category: "电影感",
    keywords: ["打印密度", "暖中间调", "高光收束"],
    suitableFor: "剧情片、品牌短片、已还原 Rec.709 素材",
    recommendedIntensity: 50,
    description: "原创数字解释，强调打印感密度、克制高光与温暖主体；不是 Kodak 官方 LUT。",
    adjustments: { intensity: 50, contrast: 14, saturation: 4, temperature: 0, tint: 0, shadowMatch: 45, midtoneMatch: 56, highlightMatch: 60, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "inspired-by-public-characteristics",
    provenanceStatement: "Original digital interpretation of general film-print characteristics. Not an official Kodak LUT and not a photochemical measurement.",
    riskLevel: "medium",
    risks: ["Strong daylight highlights may feel denser", "Uncorrected Log input is unsupported"]
  }),
  createStyle({
    id: "soft-film-print",
    name: "柔和电影打印",
    englishName: "Soft Film Print",
    category: "电影感",
    keywords: ["柔和反差", "平滑高光", "低色噪"],
    suitableFor: "人物叙事、室内自然光、婚礼与生活方式内容",
    recommendedIntensity: 50,
    description: "降低硬反差并保留中间调层次的原创柔和打印方向。",
    adjustments: { intensity: 50, contrast: -8, saturation: -5, temperature: 0, tint: 0, shadowMatch: 54, midtoneMatch: 49, highlightMatch: 62, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original parameter-authored soft print look created with the project RGB core.",
    riskLevel: "low",
    risks: ["Already-flat footage may appear too soft"]
  }),
  createStyle({
    id: "faded-negative",
    name: "褪色负片",
    englishName: "Faded Negative",
    category: "复古",
    keywords: ["抬黑", "褪色", "暖旧感"],
    suitableFor: "旅行记录、家庭影像、怀旧叙事",
    recommendedIntensity: 50,
    description: "以柔黑、低饱和和轻微暖偏构成原创负片老化观感。",
    adjustments: { intensity: 50, contrast: -18, saturation: -12, temperature: 0, tint: 0, shadowMatch: 65, midtoneMatch: 47, highlightMatch: 55, skinToneProtection: true, preserveLuma: false, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original faded-negative interpretation; no scanned film profile or third-party asset is embedded.",
    riskLevel: "medium",
    risks: ["Low-contrast footage may lose separation"]
  }),
  createStyle({
    id: "warm-drama",
    name: "暖调剧情",
    englishName: "Warm Drama",
    category: "电影感",
    keywords: ["暖主体", "厚暗部", "叙事反差"],
    suitableFor: "人物剧情、室内灯光、日落外景",
    recommendedIntensity: 50,
    description: "温暖中间调配合有重量的暗部，保留肤色稳定。",
    adjustments: { intensity: 50, contrast: 18, saturation: 2, temperature: 0, tint: 0, shadowMatch: 43, midtoneMatch: 58, highlightMatch: 62, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original warm narrative look authored from structured project parameters.",
    riskLevel: "medium",
    risks: ["Tungsten footage should be white-balanced before use"]
  }),
  createStyle({
    id: "cool-neo-noir",
    name: "冷调新黑色",
    englishName: "Cool Neo Noir",
    category: "夜景",
    keywords: ["冷暗部", "低饱和", "硬轮廓"],
    suitableFor: "夜景街头、悬疑剧情、工业空间",
    recommendedIntensity: 50,
    description: "冷色暗部与克制饱和构成的原创新黑色电影方向。",
    adjustments: { intensity: 50, contrast: 22, saturation: -10, temperature: 0, tint: 0, shadowMatch: 38, midtoneMatch: 54, highlightMatch: 57, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original cool neo-noir look; it does not reproduce a named film or production LUT.",
    riskLevel: "medium",
    risks: ["Underexposed shadows may become dense", "Warm practical lights remain intentionally separated"]
  }),
  createStyle({
    id: "natural-skin",
    name: "自然肤色",
    englishName: "Natural Skin",
    category: "人像",
    keywords: ["肤色保护", "中性", "轻反差"],
    suitableFor: "人物近景、采访、婚礼与生活方式人像",
    recommendedIntensity: 35,
    description: "以低风险微调保持肤色 Hue 与亮度结构的自然人像风格。",
    adjustments: { intensity: 35, contrast: 4, saturation: 0, temperature: 0, tint: 0, shadowMatch: 51, midtoneMatch: 53, highlightMatch: 55, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original low-risk portrait look authored for stable skin hue and luminance.",
    riskLevel: "low",
    risks: ["Does not replace exposure or white-balance correction"]
  }),
  createStyle({
    id: "clean-commercial",
    name: "干净商业",
    englishName: "Clean Commercial",
    category: "商业",
    keywords: ["中性", "轮廓清晰", "品牌安全"],
    suitableFor: "产品、美妆、家居、企业品牌内容",
    recommendedIntensity: 35,
    description: "干净中性、适度分离产品轮廓的低风险商业风格。",
    adjustments: { intensity: 35, contrast: 10, saturation: -2, temperature: 0, tint: 0, shadowMatch: 47, midtoneMatch: 52, highlightMatch: 58, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original commercial look authored for neutral product color and controlled contrast.",
    riskLevel: "low",
    risks: ["Brand-critical colors still require reference monitoring"]
  }),
  createStyle({
    id: "natural-documentary",
    name: "自然纪录",
    englishName: "Natural Documentary",
    category: "纪录片",
    keywords: ["克制", "自然光", "真实色彩"],
    suitableFor: "纪录片、采访、自然环境与观察式影像",
    recommendedIntensity: 35,
    description: "降低色彩重量并保留曝光结构的克制纪录片方向。",
    adjustments: { intensity: 35, contrast: 4, saturation: -8, temperature: 0, tint: 0, shadowMatch: 50, midtoneMatch: 50, highlightMatch: 56, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original restrained documentary look with no named-film emulation claim.",
    riskLevel: "low",
    risks: ["Low-saturation source footage may appear too restrained"]
  }),
  createStyle({
    id: "food-warm-natural",
    name: "美食暖自然",
    englishName: "Food Warm Natural",
    category: "美食",
    keywords: ["暖食物", "自然绿色", "高光安全"],
    suitableFor: "餐饮、美食制作、咖啡与生活方式内容",
    recommendedIntensity: 50,
    description: "温暖食物色彩，同时对高饱和红色和绿色保持连续保护。",
    adjustments: { intensity: 50, contrast: 8, saturation: 7, temperature: 0, tint: 0, shadowMatch: 49, midtoneMatch: 56, highlightMatch: 58, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original food look authored with red and green gamut safeguards.",
    riskLevel: "medium",
    risks: ["Mixed lighting should be neutralized before applying the look"]
  }),
  createStyle({
    id: "travel-vivid-safe",
    name: "旅行鲜活安全",
    englishName: "Travel Vivid Safe",
    category: "旅行",
    keywords: ["天空保护", "绿植安全", "鲜活"],
    suitableFor: "旅行、蓝天绿植、城市与户外记录",
    recommendedIntensity: 50,
    description: "提升旅行画面的鲜活感，同时约束天空与绿植的 Hue 漂移。",
    adjustments: { intensity: 50, contrast: 8, saturation: 9, temperature: 0, tint: 0, shadowMatch: 47, midtoneMatch: 55, highlightMatch: 56, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original travel look authored with sky, greenery, and saturated-color safety tests.",
    riskLevel: "medium",
    risks: ["Already-vivid sources may need 35 percent strength"]
  }),
  createStyle({
    id: "bleach-bypass",
    name: "漂白旁路启发",
    englishName: "Bleach Bypass Inspired",
    category: "黑白",
    keywords: ["低彩度", "高反差", "金属感"],
    suitableFor: "工业、动作、历史与高质感黑白倾向画面",
    recommendedIntensity: 50,
    description: "依据公开的一般漂白旁路视觉特征原创实现，不是实验室工艺复刻。",
    adjustments: { intensity: 50, contrast: 25, saturation: -50, temperature: 0, tint: 0, shadowMatch: 40, midtoneMatch: 58, highlightMatch: 60, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "inspired-by-public-characteristics",
    provenanceStatement: "Original digital interpretation of general bleach-bypass characteristics; not a laboratory process match.",
    riskLevel: "high",
    risks: ["Strong contrast may require exposure correction", "Not suitable for color-critical product work"]
  }),
  createStyle({
    id: "neon-night",
    name: "霓虹夜色",
    englishName: "Neon Night",
    category: "夜景",
    keywords: ["蓝紫", "霓虹", "高饱和保护"],
    suitableFor: "夜店、城市霓虹、音乐视觉与科技内容",
    recommendedIntensity: 50,
    description: "蓝紫氛围和受控霓虹饱和度构成的原创夜景风格。",
    adjustments: { intensity: 50, contrast: 18, saturation: 12, temperature: 0, tint: 0, shadowMatch: 42, midtoneMatch: 60, highlightMatch: 55, skinToneProtection: true, preserveLuma: true, preventOversaturation: true },
    provenanceType: "original-authored",
    provenanceStatement: "Original neon-night look authored with hue-preserving gamut compression.",
    riskLevel: "high",
    risks: ["Strong magenta practicals may require 35 percent strength", "Daylight footage is outside the primary use case"]
  })
];
