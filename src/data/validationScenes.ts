import type { ValidationScene } from "../types/lutValidation";

export const validationScenes: readonly ValidationScene[] = [
  {
    id: "portrait-normal",
    label: "正常曝光人物",
    description: "检查肤色、正常曝光和中间调稳定性。",
    focus: ["肤色", "中间调", "曝光余量"],
    defaultSkinProtection: true,
    expectedRoles: ["log-source", "normalized-rec709", "target-look", "reference-look"]
  },
  {
    id: "portrait-close",
    label: "人物近景",
    description: "检查近景肤色、红唇和局部饱和度。",
    focus: ["肤色", "红色保护", "局部饱和度"],
    defaultSkinProtection: true,
    expectedRoles: ["log-source", "normalized-rec709", "target-look", "reference-look"]
  },
  {
    id: "blue-sky",
    label: "蓝天",
    description: "检查蓝色偏青、偏紫和高光平滑性。",
    focus: ["天空蓝", "高光", "色温"],
    defaultSkinProtection: false,
    expectedRoles: ["log-source", "normalized-rec709", "target-look", "reference-look"]
  },
  {
    id: "blue-sky-greenery",
    label: "蓝天绿植",
    description: "检查蓝绿分离、饱和度和阴影颜色。",
    focus: ["蓝绿分离", "饱和度", "阴影"],
    defaultSkinProtection: false,
    expectedRoles: ["log-source", "normalized-rec709", "target-look", "reference-look"]
  },
  {
    id: "daylight-high-contrast",
    label: "高反差白天",
    description: "检查黑位堵塞、高光裁切和对比度安全性。",
    focus: ["阴影", "高光", "对比度"],
    defaultSkinProtection: false,
    expectedRoles: ["log-source", "normalized-rec709", "target-look", "reference-look"]
  },
  {
    id: "saturated-red",
    label: "高饱和红色物体",
    description: "检查红色溢出和高饱和色安全性。",
    focus: ["红色保护", "饱和度", "通道边界"],
    defaultSkinProtection: false,
    expectedRoles: ["log-source", "normalized-rec709", "target-look", "reference-look"]
  }
];

export const getValidationScene = (sceneId: string | undefined): ValidationScene | undefined => {
  return validationScenes.find((scene) => scene.id === sceneId);
};
