import { previewImages } from "./mockImages";
import type { LutStyle, StyleCategory } from "../types";

export const styleCategories: readonly StyleCategory[] = [
  "全部",
  "电影感",
  "人像摄影",
  "城市夜景",
  "复古胶片",
  "商业广告",
  "赛博风格"
];

export const lutStyles: readonly LutStyle[] = [
  {
    id: "cinematic-teal-orange",
    name: "青橙电影感",
    category: "电影感",
    keywords: ["青色阴影", "橙色肤色", "高光克制"],
    suitableFor: "旅行短片、剧情片静帧、城市人物素材",
    recommendedIntensity: 72,
    previewImage: previewImages.tealOrange,
    description: "用青色暗部和暖橙肤色建立电影化对比，适合需要快速提升叙事感的画面。"
  },
  {
    id: "cinematic-cool-low-saturation",
    name: "低饱和冷调",
    category: "电影感",
    keywords: ["冷调", "低饱和", "柔和反差"],
    suitableFor: "纪录片、室内自然光、阴天外景",
    recommendedIntensity: 58,
    previewImage: previewImages.coolLowSat,
    description: "降低整体饱和度并压住暖色，让画面更安静、克制、耐看。"
  },
  {
    id: "cinematic-black-gold-night",
    name: "黑金夜景",
    category: "电影感",
    keywords: ["深黑", "金色高光", "夜景"],
    suitableFor: "夜景街拍、车流、商业氛围片",
    recommendedIntensity: 66,
    previewImage: previewImages.blackGold,
    description: "保留暗部厚度，突出金色灯光层次，适合夜间高质感素材。"
  },
  {
    id: "portrait-korean-cream",
    name: "韩系奶油",
    category: "人像摄影",
    keywords: ["奶油肤色", "柔和", "低对比"],
    suitableFor: "人像写真、生活方式内容、室内窗光",
    recommendedIntensity: 54,
    previewImage: previewImages.creamPortrait,
    description: "柔化反差并提亮肤色，让人像呈现干净温柔的奶油质感。"
  },
  {
    id: "portrait-japanese-clear",
    name: "日系清透",
    category: "人像摄影",
    keywords: ["清透", "浅青", "明亮"],
    suitableFor: "户外人像、校园感短片、自然光照片",
    recommendedIntensity: 49,
    previewImage: previewImages.cleanJapan,
    description: "提升明度并控制色彩重量，形成轻盈、透明、呼吸感更强的画面。"
  },
  {
    id: "portrait-warm-film",
    name: "暖调胶片",
    category: "人像摄影",
    keywords: ["暖调", "胶片颗粒感", "肤色友好"],
    suitableFor: "情侣写真、日落人像、复古生活记录",
    recommendedIntensity: 63,
    previewImage: previewImages.warmFilm,
    description: "用暖色中间调和柔和高光塑造亲近感，适合强调情绪的人像素材。"
  },
  {
    id: "night-harbor-neon",
    name: "港风霓虹",
    category: "城市夜景",
    keywords: ["霓虹", "青红对比", "湿润街景"],
    suitableFor: "城市夜景、店招灯光、街头短片",
    recommendedIntensity: 70,
    previewImage: previewImages.neonHarbor,
    description: "强化霓虹色彩和湿润反光，让城市夜景更具港风氛围。"
  },
  {
    id: "night-rain-street",
    name: "雨夜街头",
    category: "城市夜景",
    keywords: ["雨夜", "反光", "低照度"],
    suitableFor: "雨天街拍、车窗素材、暗光城市片段",
    recommendedIntensity: 62,
    previewImage: previewImages.rainyStreet,
    description: "压暗环境并拉出反光层次，让雨夜画面更有空间和情绪。"
  },
  {
    id: "night-casino-city",
    name: "赛博都市",
    category: "城市夜景",
    keywords: ["蓝紫", "都市", "高反差"],
    suitableFor: "夜景延时、未来感街拍、电子音乐视觉",
    recommendedIntensity: 76,
    previewImage: previewImages.cyberCity,
    description: "用蓝紫阴影和高亮霓虹制造强烈都市未来感。"
  },
  {
    id: "retro-classic-film",
    name: "复古胶片",
    category: "复古胶片",
    keywords: ["复古", "柔和黑位", "暖色偏移"],
    suitableFor: "家庭影像、旅行记录、怀旧主题短片",
    recommendedIntensity: 57,
    previewImage: previewImages.warmFilm,
    description: "柔化黑位并加入暖色偏移，保留胶片式的时间感。"
  },
  {
    id: "retro-hk-90s",
    name: "90年代港片",
    category: "复古胶片",
    keywords: ["港片", "浓郁", "暖绿阴影"],
    suitableFor: "街头人像、复古剧情、室内钨丝灯",
    recommendedIntensity: 69,
    previewImage: previewImages.neonHarbor,
    description: "带有轻微偏绿暗部和浓郁暖光，适合复古叙事画面。"
  },
  {
    id: "retro-warm-brown",
    name: "暖棕胶片",
    category: "复古胶片",
    keywords: ["暖棕", "柔和", "低饱和"],
    suitableFor: "咖啡馆、手作内容、秋冬生活片",
    recommendedIntensity: 52,
    previewImage: previewImages.warmFilm,
    description: "用暖棕色统一画面情绪，让素材更安静、复古、耐看。"
  },
  {
    id: "commercial-premium-gray",
    name: "高级灰广告",
    category: "商业广告",
    keywords: ["高级灰", "干净", "品牌质感"],
    suitableFor: "产品短片、品牌视觉、空间展示",
    recommendedIntensity: 55,
    previewImage: previewImages.coolLowSat,
    description: "控制色彩噪音并强化灰阶层次，适合现代商业广告质感。"
  },
  {
    id: "commercial-high-contrast",
    name: "高反差质感",
    category: "商业广告",
    keywords: ["高反差", "锐利", "质感"],
    suitableFor: "运动产品、汽车细节、科技类素材",
    recommendedIntensity: 68,
    previewImage: previewImages.blackGold,
    description: "提高明暗分离和局部质感，让产品轮廓更清晰有力。"
  },
  {
    id: "commercial-clean-bright",
    name: "干净通透",
    category: "商业广告",
    keywords: ["通透", "明亮", "低杂色"],
    suitableFor: "美妆、家居、食品与生活方式内容",
    recommendedIntensity: 47,
    previewImage: previewImages.cleanJapan,
    description: "提亮画面并减少色偏，适合需要清爽可信的商业内容。"
  },
  {
    id: "cyber-punk",
    name: "赛博朋克",
    category: "赛博风格",
    keywords: ["赛博", "霓虹", "强色彩"],
    suitableFor: "音乐视觉、夜景人像、游戏向短片",
    recommendedIntensity: 82,
    previewImage: previewImages.cyberCity,
    description: "强化蓝紫和洋红霓虹，制造高能量的未来城市氛围。"
  },
  {
    id: "cyber-blue-purple-neon",
    name: "蓝紫霓虹",
    category: "赛博风格",
    keywords: ["蓝紫", "霓虹边缘", "冷暖对撞"],
    suitableFor: "直播封面、夜店视觉、电子产品短片",
    recommendedIntensity: 74,
    previewImage: previewImages.neonHarbor,
    description: "用蓝紫色主导暗部，让高光霓虹更跳跃、更有速度感。"
  },
  {
    id: "cyber-future-city",
    name: "未来都市",
    category: "赛博风格",
    keywords: ["未来感", "冷色", "金属"],
    suitableFor: "科技城市、建筑外立面、概念视觉",
    recommendedIntensity: 71,
    previewImage: previewImages.cyberCity,
    description: "保留冷色金属质感，并让亮部形成清晰的未来城市秩序。"
  }
];
