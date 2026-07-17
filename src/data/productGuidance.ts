import type { ProductTermDefinition, TargetEditor, TargetEditorGuide } from "../types/productWorkflow";

export const productTerms: readonly ProductTermDefinition[] = [
  {
    id: "log",
    term: "Log",
    chineseName: "对数拍摄曲线",
    oneLineExplanation: "相机为保留动态范围而记录的灰、低对比画面，需要先做技术还原。",
    owner: "camera",
    userAction: "确认相机拍摄曲线，或选择不确定。",
    misconfigurationConsequence: "直接套创意 LUT 可能出现反差和颜色异常。",
    showInQuickMode: true
  },
  {
    id: "gamma",
    term: "Gamma",
    chineseName: "亮度编码曲线",
    oneLineExplanation: "描述像素亮度如何编码，必须与素材实际状态一致。",
    owner: "website",
    userAction: "专业模式中按当前静帧真实编码选择。",
    misconfigurationConsequence: "错误设置会造成明暗和中间调不一致。",
    showInQuickMode: false
  },
  {
    id: "gamut",
    term: "Gamut",
    chineseName: "色域",
    oneLineExplanation: "描述素材能够表示的颜色范围。",
    owner: "website",
    userAction: "专业模式中与 Gamma 配套选择。",
    misconfigurationConsequence: "错误设置可能导致肤色、原色和饱和度偏离。",
    showInQuickMode: false
  },
  {
    id: "range",
    term: "Range",
    chineseName: "信号范围",
    oneLineExplanation: "描述黑白电平码值使用 Full 还是 Legal 范围。",
    owner: "professional-diagnostics",
    userAction: "只有确认软件或相机规范时再修改。",
    misconfigurationConsequence: "错误设置会造成黑位抬起、压死或高光异常。",
    showInQuickMode: false
  },
  {
    id: "cst",
    term: "CST",
    chineseName: "色彩空间转换",
    oneLineExplanation: "DaVinci 中把 Log 素材转换为正常 Rec.709 画面的节点工具。",
    owner: "davinci",
    userAction: "灰色 Log 素材应先用 CST 或项目色彩管理还原。",
    misconfigurationConsequence: "漏做或重复做都会让创意 LUT 结果错误。",
    showInQuickMode: true
  },
  {
    id: "post-lut",
    term: "POST LUT",
    chineseName: "后期创意 LUT",
    oneLineExplanation: "用于已还原 Rec.709 素材的风格文件，不包含相机 Log 技术转换。",
    owner: "website",
    userAction: "放在技术还原和基础校正之后。",
    misconfigurationConsequence: "直接套在 Log 上会产生不可靠结果。",
    showInQuickMode: true
  },
  {
    id: "cammon",
    term: "CAMMON",
    chineseName: "实验性相机监看 LUT",
    oneLineExplanation: "供支持 LUT 的相机或监视器测试监看，不等同于后期技术转换。",
    owner: "camera",
    userAction: "按机型说明确认格式、点数、Range 和导入方式。",
    misconfigurationConsequence: "未核验机型上可能无法导入或显示不正确。",
    showInQuickMode: false
  },
  {
    id: "input-profile",
    term: "Input Profile",
    chineseName: "输入素材配置",
    oneLineExplanation: "告诉网站当前上传静帧实际采用的亮度曲线、色域和范围。",
    owner: "website",
    userAction: "按静帧当前状态选择，不要只按原始相机来源猜测。",
    misconfigurationConsequence: "预览与导出的输入假设会不一致。",
    showInQuickMode: false
  },
  {
    id: "cube-hash",
    term: "Cube Hash",
    chineseName: "LUT 文件指纹",
    oneLineExplanation: "用于验证两次导出的 Cube 内容是否完全一致。",
    owner: "professional-diagnostics",
    userAction: "普通使用无需操作，需要排查一致性时再查看。",
    misconfigurationConsequence: "不影响画面，只影响问题追踪和复现。",
    showInQuickMode: false
  },
  {
    id: "pre-post",
    term: "PRE / POST",
    chineseName: "处理前 / 处理后",
    oneLineExplanation: "用于比较同一帧应用 LUT 前后的文件。",
    owner: "professional-diagnostics",
    userAction: "只在 Round-Trip 验证中使用。",
    misconfigurationConsequence: "使用不同帧会让一致性结果失效。",
    showInQuickMode: false
  },
  {
    id: "round-trip",
    term: "Round-Trip",
    chineseName: "往返回读校验",
    oneLineExplanation: "把软件渲染结果读回网站，检查 Cube 在不同工具中的数值一致性。",
    owner: "professional-diagnostics",
    userAction: "出现网站与剪辑软件效果不一致时再使用。",
    misconfigurationConsequence: "错误 Gamma、Range 或不同帧会产生假失败。",
    showInQuickMode: false
  },
  {
    id: "technical-transform",
    term: "Technical Transform",
    chineseName: "技术转换",
    oneLineExplanation: "按明确来源把相机 Log 和宽色域还原到目标显示空间。",
    owner: "davinci",
    userAction: "优先使用 DaVinci 色彩管理、CST 或厂商官方流程。",
    misconfigurationConsequence: "未经核验的转换不能被当作官方支持。",
    showInQuickMode: true
  }
];

export const targetEditorGuides: Readonly<Record<TargetEditor, TargetEditorGuide>> = {
  "davinci-resolve": {
    editor: "davinci-resolve",
    label: "DaVinci Resolve",
    location: "调色页的独立节点",
    steps: [
      "如果素材是 Log，先用项目色彩管理或 CST 节点还原到 Rec.709 / Gamma 2.4。",
      "完成基础曝光和白平衡校正。",
      "在下一个独立节点加载本 POST LUT，并保持 Key Output Gain 为 1.000。",
      "最后按镜头做局部微调。"
    ],
    commonMistake: "不要在 Log 还原前直接套 POST LUT，也不要同时降低 LUT 强度和节点 Key Gain。"
  },
  "premiere-pro": {
    editor: "premiere-pro",
    label: "Premiere Pro",
    location: "Lumetri Color 的 Creative / Look",
    steps: [
      "如果素材是 Log，先通过正确的输入 LUT 或色彩管理还原。",
      "在 Lumetri Color 的 Basic Correction 中完成曝光和白平衡。",
      "在 Creative / Look 中加载本 POST LUT。",
      "需要减弱时优先回到网站导出较低强度版本。"
    ],
    commonMistake: "不要在 Input LUT 和 Creative Look 两处重复加载同一文件。"
  },
  "final-cut-pro": {
    editor: "final-cut-pro",
    label: "Final Cut Pro",
    location: "Custom LUT 效果",
    steps: [
      "先确认素材的相机 LUT 或色彩空间覆盖设置正确。",
      "完成曝光和白平衡基础校正。",
      "添加 Custom LUT 效果并选择本 POST LUT。",
      "确认输入输出均按 Rec.709 工作流解释。"
    ],
    commonMistake: "不要让自动相机 LUT 与手动技术转换重复生效。"
  },
  "camera-monitoring": {
    editor: "camera-monitoring",
    label: "相机 / 外接监视器",
    location: "设备支持的用户 LUT 槽位",
    steps: [
      "确认具体机型支持的 LUT 格式、点数和 Range。",
      "只在小范围测试素材上验证高光、肤色和亮度。",
      "确认 LUT 仅用于监看，除非设备文档明确说明可烘焙录制。",
      "保留原始素材和正常色彩管理流程。"
    ],
    commonMistake: "待官方确认的机型目录只适合实验，不能当作已核验支持。"
  },
  "other-cube": {
    editor: "other-cube",
    label: "其他支持 .cube 的软件",
    location: "软件的 Creative LUT / Look 插槽",
    steps: [
      "确认软件支持 3D .cube 和当前点数。",
      "先把素材还原到 Rec.709 / Gamma 2.4。",
      "再加载本 POST LUT。",
      "用校准图或同一帧检查 Gamma 与 Range 是否一致。"
    ],
    commonMistake: "软件自动色彩管理可能已经做过转换，避免重复处理。"
  }
};
