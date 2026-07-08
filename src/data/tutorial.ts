import type { TutorialStep } from "../types";

export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: "prepare-frame",
    title: "准备目标静帧",
    summary: "从视频素材中截取一张能代表当前场景光线和肤色的静帧。",
    details: ["优先选择曝光正常的画面。", "避免强压缩截图。", "如果素材来自 Log，请在工作台选择正确的输入色彩空间。"]
  },
  {
    id: "choose-reference",
    title: "选择参考风格",
    summary: "上传参考图或从风格库选择一个接近目标情绪的风格。",
    details: ["参考图不需要与目标画面完全相同。", "优先匹配影调、冷暖和对比度。", "风格强度建议从 50 到 70 开始微调。"]
  },
  {
    id: "tune-parameters",
    title: "微调匹配参数",
    summary: "使用阴影、中间调和高光匹配控制仿色范围。",
    details: ["阴影匹配影响暗部色偏。", "中间调匹配主要影响肤色和主体。", "高光匹配决定天空、灯光和反光的质感。"]
  },
  {
    id: "export-lut",
    title: "导出 .cube LUT",
    summary: "确认预览后导出 LUT，并在剪辑或调色软件中应用。",
    details: ["普通短片建议使用 33x33x33 精度。", "高端流程可以选择 65x65x65。", "导出前记录输入色彩空间，避免后续套用错误。"]
  }
];
