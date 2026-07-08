import type { ColorAnalysisReport } from "../types";

export const colorAnalysisReport: ColorAnalysisReport = {
  dominantColors: [
    { name: "深青阴影", hex: "#102f3b", ratio: 34 },
    { name: "暖橙肤色", hex: "#d78a53", ratio: 27 },
    { name: "蓝紫环境光", hex: "#4b4d9f", ratio: 21 },
    { name: "柔白高光", hex: "#e8dac2", ratio: 18 }
  ],
  temperature: "暖调",
  saturationLevel: "中等饱和",
  contrastLevel: "高反差",
  keywords: ["青橙对比", "夜景氛围", "暖色主体", "暗部厚度"],
  advice: "建议降低高光匹配到 55 左右，保留灯光层次；中间调匹配可保持 70，确保人物肤色稳定。"
};
