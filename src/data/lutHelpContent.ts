export interface LutHelpContent {
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export const lutHelpContent = {
  cameraBrand: {
    title: "相机品牌",
    paragraphs: ["用于选择目标相机的 LUT 导入兼容目录，不代表本工具已经完成该品牌的官方色彩转换。"]
  },
  cameraModel: {
    title: "相机型号",
    paragraphs: ["不同型号可能支持不同 LUT 格式、点数、槽位、Range 和监看方式。当前目录中的兼容信息仍需以厂商资料和实际相机测试为准。"]
  },
  logCurve: {
    title: "Log 曲线",
    paragraphs: ["它代表素材输入曲线。本工具当前不会执行官方 Log 技术转换，因此不能把创意 LUT 当作 Log 到 Rec.709 的还原 LUT。"]
  },
  gamut: {
    title: "Gamut",
    paragraphs: ["它代表输入色域，必须与 Log 工作流配套理解。Gamma 与 Gamut 的选项仅写入 LUT 元信息和使用建议，不会伪造厂商色彩科学。"]
  },
  lutUse: {
    title: "LUT 用途",
    paragraphs: ["仅监看：仅用于相机屏幕或外接监视器预览。", "监看并记录：只有厂商已确认支持烘焙 LUT 的机型才适用。", "未知：仅作目录占位。待确认机型默认只推荐“仅监看”。"]
  },
  lutCubeSize: {
    title: "LUT 点数",
    paragraphs: ["17 点：文件较小、精度较低。", "33 点：常见的文件大小与精度平衡。", "65 点：精度更高，但许多相机不支持。", "自动推荐：由当前目录给出临时建议；待官方确认时并不代表厂商规范。"]
  },
  range: {
    title: "Range",
    paragraphs: ["自动 / 未知：当前暂无官方确认，暂按 Full Range 输出。", "Full Range：RGB 保持 0 到 1 输出。", "Legal Range：RGB 会映射到通用视频合法范围。", "通用 Legal 映射不代表已符合某一特定相机的官方规范。"]
  },
  monitoringMode: {
    title: "监看亮度模式",
    paragraphs: ["标准监看：不附加亮度偏移。", "ETTR 归一化监看：以你的计划拍摄偏移为依据，反向调整 LUT 显示亮度。", "手动 LUT 亮度偏移：直接改变监看显示亮度，仅用于观察。"]
  },
  shootingExposureTarget: {
    title: "拍摄曝光目标",
    paragraphs: ["ETTR +2 EV 表示你计划拍摄时向右曝光约 +2 EV，LUT 显示会反向归一化约 -2 EV。它不会自动改变相机的真实曝光、EI 或 Zebra 设置。"]
  },
  manualBrightnessOffset: {
    title: "手动亮度偏移",
    paragraphs: ["它只改变 LUT 的显示亮度，不是 ETTR，也不是相机曝光建议。正式拍摄前请在相机和监视器上测试高光与肤色表现。"]
  },
  sensorFormat: {
    title: "传感器 / 画幅",
    paragraphs: ["画幅只是相机特征之一，不能仅凭全画幅、APS-C 或 MFT 直接得出固定 ETTR 建议。曝光策略仍应按具体机型、场景与官方说明确定。"]
  },
  dataStatus: {
    title: "数据状态",
    paragraphs: ["官方确认：已有明确官方资料支撑。", "社区参考：来自非官方工作流参考，仍需验证。", "待官方确认：目录项已建立，但规格尚未核验。", "占位目录：仅为未来扩展预留，不可视为兼容承诺。"]
  },
  resolvedCubeSize: {
    title: "最终导出点数",
    paragraphs: ["自动推荐只是选择一个目录建议；最终导出点数才是写入 .cube 文件的 3D 网格大小。手动选择的点数仍会受当前目录的最大点数限制。"]
  },
  lutName: {
    title: "LUT 名称",
    paragraphs: ["自动命名会随品牌、曲线、亮度语义和点数更新。完整命名会包含更多机型信息。手动编辑后会转为自定义命名；可使用“恢复自动命名”回到建议名称。", "输入框、下载文件名和 .cube TITLE 使用同一名称。"]
  },
  postNamingMode: {
    title: "后期 LUT 命名模式",
    paragraphs: ["简洁命名只包含 POST、Rec709、风格名称、点数与版本。完整命名会附加 SRC 素材来源提示。", "SRC 只说明制作该创意 LUT 时工作台选择的素材配置，不表示文件包含 Log 到 Rec.709 的技术转换。"]
  }
} as const satisfies Record<string, LutHelpContent>;

export type LutHelpKey = keyof typeof lutHelpContent;
