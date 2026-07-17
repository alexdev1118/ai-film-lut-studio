import type { ColorContainer, ColorEncodingProfile, ColorEncodingProfileId, PostLutContract, PreviewDisplayTransform } from "../types";

const browserContainers: readonly ColorContainer[] = ["jpg", "png", "webp", "tiff", "video-frame"];
const stillContainers: readonly ColorContainer[] = ["jpg", "png", "webp", "tiff", "dpx", "video-frame"];

export const colorEncodingProfiles: readonly ColorEncodingProfile[] = [
  {
    id: "srgb-full",
    displayName: "sRGB / Full",
    primaries: "bt709",
    transferFunction: "srgb",
    range: "full",
    matrix: "identity-rgb",
    sceneOrDisplayReferred: "display-referred",
    intendedUse: "普通 JPG、PNG、WebP、TIFF 与浏览器图像。",
    validContainers: browserContainers,
    confidence: "high",
    sourceStatus: "standards-defined",
    status: "supported",
    enabledForPostExport: true,
    enabledForPreviewOnly: false,
    warning: "浏览器通常按 sRGB 显示；嵌入 Display P3 或其他 ICC 的文件当前不会自动解析。",
    recommendedDaVinciSettings: {
      inputColorSpace: "sRGB",
      inputGamma: "sRGB",
      dataLevels: "Full",
      note: "用于普通网页图像；不要将其误标为 Rec.709 Gamma 2.4。"
    }
  },
  {
    id: "bt709-g24-full",
    displayName: "Rec.709 / Gamma 2.4 / Full",
    primaries: "bt709",
    transferFunction: "bt1886-gamma24",
    range: "full",
    matrix: "identity-rgb",
    sceneOrDisplayReferred: "display-referred",
    intendedUse: "DaVinci 已转换到 Rec.709 Gamma 2.4 并按 Full Range 导出的静帧。",
    validContainers: stillContainers,
    confidence: "high",
    sourceStatus: "standards-defined",
    status: "supported",
    enabledForPostExport: true,
    enabledForPreviewOnly: false,
    warning: "只适用于已经完成 Log 技术还原的素材。",
    recommendedDaVinciSettings: {
      inputColorSpace: "Rec.709",
      inputGamma: "Gamma 2.4",
      dataLevels: "Full",
      note: "这是 POST LUT 的正式输入与输出契约。"
    }
  },
  {
    id: "bt709-g24-legal",
    displayName: "Rec.709 / Gamma 2.4 / Legal",
    primaries: "bt709",
    transferFunction: "bt1886-gamma24",
    range: "legal",
    matrix: "identity-rgb",
    sceneOrDisplayReferred: "display-referred",
    intendedUse: "以 Video / Legal Range 编码的 Rec.709 Gamma 2.4 静帧。",
    validContainers: ["tiff", "dpx"],
    confidence: "high",
    sourceStatus: "standards-defined",
    status: "supported",
    enabledForPostExport: true,
    enabledForPreviewOnly: false,
    warning: "仅在源文件确实为 Legal Range 时使用；错误选择会抬高黑位并压低白位。",
    recommendedDaVinciSettings: {
      inputColorSpace: "Rec.709",
      inputGamma: "Gamma 2.4",
      dataLevels: "Video",
      note: "Range 在进入内部工作空间时只扩展一次。"
    }
  },
  {
    id: "bt709-g22-full",
    displayName: "Rec.709 / Gamma 2.2 / Full",
    primaries: "bt709",
    transferFunction: "gamma22",
    range: "full",
    matrix: "identity-rgb",
    sceneOrDisplayReferred: "display-referred",
    intendedUse: "明确按 Gamma 2.2 编码的 Rec.709 静帧。",
    validContainers: stillContainers,
    confidence: "high",
    sourceStatus: "standards-defined",
    status: "supported",
    enabledForPostExport: true,
    enabledForPreviewOnly: false,
    warning: "Gamma 2.2 与 Gamma 2.4 是不同 Profile，不能互换。",
    recommendedDaVinciSettings: {
      inputColorSpace: "Rec.709",
      inputGamma: "Gamma 2.2",
      dataLevels: "Full",
      note: "导出静帧时必须明确使用 Gamma 2.2。"
    }
  },
  {
    id: "dci-p3-g26-full",
    displayName: "DCI-P3 / Gamma 2.6 / Full（实验性）",
    primaries: "dci-p3",
    transferFunction: "gamma26",
    range: "full",
    matrix: "identity-rgb",
    sceneOrDisplayReferred: "display-referred",
    intendedUse: "数字影院 DCI-P3 Gamma 2.6 静帧的诊断性预览。",
    validContainers: ["tiff", "dpx"],
    confidence: "medium",
    sourceStatus: "standards-defined",
    status: "experimental",
    enabledForPostExport: false,
    enabledForPreviewOnly: true,
    warning: "当前仅用于实验性预览，不允许作为正式 Rec.709 POST 导出输入。",
    recommendedDaVinciSettings: {
      inputColorSpace: "DCI-P3",
      inputGamma: "Gamma 2.6",
      dataLevels: "Full",
      note: "DCI-P3 与 Display P3 不同，当前工作台不提供正式 P3 POST 输出契约。"
    }
  },
  {
    id: "display-p3-srgb-full",
    displayName: "Display P3 / sRGB Transfer / Full（实验性）",
    primaries: "display-p3",
    transferFunction: "srgb",
    range: "full",
    matrix: "identity-rgb",
    sceneOrDisplayReferred: "display-referred",
    intendedUse: "带 Display P3 色域和 sRGB 传递函数的图像诊断预览。",
    validContainers: ["jpg", "png", "tiff"],
    confidence: "medium",
    sourceStatus: "standards-defined",
    status: "experimental",
    enabledForPostExport: false,
    enabledForPreviewOnly: true,
    warning: "浏览器 ICC 解码状态不可直接从 Canvas 像素可靠反推，当前只提供人工确认后的实验性预览。",
    recommendedDaVinciSettings: {
      inputColorSpace: "Display P3",
      inputGamma: "sRGB",
      dataLevels: "Full",
      note: "不要与 DCI-P3 Gamma 2.6 混用。"
    }
  },
  {
    id: "unknown-manual",
    displayName: "Unknown / Manual",
    primaries: "unknown",
    transferFunction: "unknown",
    range: "unknown",
    matrix: "unknown",
    sceneOrDisplayReferred: "unknown",
    intendedUse: "Header 或来源不足以判断编码时的低可信占位。",
    validContainers: stillContainers,
    confidence: "low",
    sourceStatus: "unknown",
    status: "warning-only",
    enabledForPostExport: false,
    enabledForPreviewOnly: true,
    warning: "当前输入状态未确认，不会静默升级为 Rec.709 Gamma 2.4。",
    recommendedDaVinciSettings: {
      inputColorSpace: "Unknown",
      inputGamma: "Unknown",
      dataLevels: "Auto",
      note: "请先确认导出设置，再选择一个受支持 Profile。"
    }
  },
  {
    id: "camera-log-unconverted",
    displayName: "Camera Log / Unconverted",
    primaries: "camera-native",
    transferFunction: "camera-log",
    range: "unknown",
    matrix: "unknown",
    sceneOrDisplayReferred: "scene-referred",
    intendedUse: "尚未完成 CST、RCM 或厂商技术转换的相机 Log 静帧。",
    validContainers: ["tiff", "dpx"],
    confidence: "low",
    sourceStatus: "user-confirmed",
    status: "warning-only",
    enabledForPostExport: false,
    enabledForPreviewOnly: true,
    warning: "禁止直接进入 Rec.709 POST 创意 LUT；必须先绑定有效技术转换。",
    recommendedDaVinciSettings: {
      inputColorSpace: "按相机确认",
      inputGamma: "按相机确认",
      dataLevels: "Auto",
      note: "先执行 CST、RCM 或厂商技术转换，再进入 POST LUT。"
    }
  }
];

export const postLutContract: PostLutContract = {
  id: "post-bt709-g24-full",
  displayName: "Rec.709 / Gamma 2.4 / Full",
  inputProfileId: "bt709-g24-full",
  outputProfileId: "bt709-g24-full",
  intendedUse: "技术还原与基础校正之后的后期创意 Look。",
  prohibitedUse: "禁止直接应用于未转换的 Camera Log。"
};

export const browserPreviewDisplayTransform: PreviewDisplayTransform = {
  id: "bt709-g24-to-browser-srgb",
  sourceProfileId: "bt709-g24-full",
  destinationProfileId: "srgb-full",
  displayAssumption: "Canvas 输出编码为 sRGB，并由浏览器显示管理呈现。",
  limitation: "浏览器、系统显示 ICC 和 DaVinci Viewer 显示管理仍可能造成视觉差异。"
};

export const getColorEncodingProfile = (profileId: ColorEncodingProfileId | string | undefined): ColorEncodingProfile => {
  return colorEncodingProfiles.find((profile) => profile.id === profileId)
    ?? colorEncodingProfiles.find((profile) => profile.id === "unknown-manual")
    ?? colorEncodingProfiles[0];
};

export const getProfilesForContainer = (container: ColorContainer): readonly ColorEncodingProfile[] => {
  return colorEncodingProfiles.filter((profile) => profile.validContainers.includes(container));
};
