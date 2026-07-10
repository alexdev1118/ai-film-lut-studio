import type { CameraBrand, CameraLutSupportProfile, CameraLutUseType, SensorFormat } from "../types";
import { getCameraDataSourceIdsForModel } from "./cameraDataSources";
import { getCameraVerifiedFactIdsForModel } from "./cameraVerifiedFacts";

interface CameraLutBrandOption {
  readonly id: CameraBrand;
  readonly label: string;
}

interface CameraModelInput {
  readonly brand: CameraBrand;
  readonly brandLabel: string;
  readonly modelName: string;
  readonly modelFamily: string;
  readonly sensorFormat: SensorFormat;
  readonly supportedLogProfiles: readonly string[];
  readonly supportedGamuts: readonly string[];
  readonly maxCubeSize?: 17 | 33 | 65 | "unknown";
  readonly recommendedCubeSize?: 17 | 33 | 65;
  readonly lutUseType?: CameraLutUseType;
}

const defaultImportMethod = "请参考机身官方说明书或厂商软件说明确认 LUT 导入路径、文件名限制和监看/录制行为。";
const defaultWarning = "该机型 LUT 规格尚未通过官方资料确认，请先小范围测试，正式拍摄前不要依赖单一监看 LUT 判断曝光和色彩。";
const defaultMonitoringNotes =
  "V1 导出的是基于当前创意参数的相机监看 LUT 文件，不是官方 Log 技术转换 LUT，也不等同于改变相机实际曝光。";

const makeProfile = ({
  brand,
  brandLabel,
  modelName,
  modelFamily,
  sensorFormat,
  supportedLogProfiles,
  supportedGamuts,
  maxCubeSize = "unknown",
  recommendedCubeSize = 33,
  lutUseType = "unknown"
}: CameraModelInput): CameraLutSupportProfile => {
  const normalizedModelId = modelName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const sourceIds = getCameraDataSourceIdsForModel(brand, modelName);
  const verifiedFactIds = getCameraVerifiedFactIdsForModel(brand, modelName);
  const hasEvidenceRegistry = sourceIds.length > 0;

  return {
    id: `${brand}-${normalizedModelId}`,
    brand,
    brandLabel,
    modelName,
    modelFamily,
    sensorFormat,
    supported: "unknown",
    lutUseType,
    supportedFormats: [".cube", "unknown"],
    maxCubeSize,
    recommendedCubeSize,
    range: "unknown",
    importMethod: defaultImportMethod,
    fileNameRules: "待官方资料确认。建议使用英文、数字、下划线和短文件名。",
    maxSlots: "unknown",
    supportedLogProfiles,
    supportedGamuts,
    exposureTools: {
      supportsEiMetadata: "unknown",
      supportsExposureOffset: "unknown",
      exposureOffsetLabel: "Monitoring EV offset",
      notes: "EV 偏移只写入生成的监看 LUT 映射，不代表相机 EI / ISO / 实际曝光建议。"
    },
    monitoringNotes: defaultMonitoringNotes,
    warning: defaultWarning,
    dataStatus: "needs-official-confirmation",
    ...(hasEvidenceRegistry ? { sourceIds, verifiedFactIds, firmwareScope: ["待按官方固件版本核验"] } : {}),
    confidenceLevel: "unknown",
    officialSourceNeeded: true,
    sourceNotes: "需要补充官方说明书、厂商 LUT 导入文档或经用户实机验证的资料。"
  };
};

const sonyLogProfiles = ["S-Log3", "S-Log2", "S-Cinetone", "HLG"];
const sonyGamuts = ["S-Gamut3.Cine", "S-Gamut3", "S-Gamut", "Rec.709"];
const canonLogProfiles = ["C-Log", "C-Log2", "C-Log3", "Wide DR", "Canon 709"];
const canonGamuts = ["Cinema Gamut", "BT.709", "Rec.709"];
const panasonicLogProfiles = ["V-Log", "V-Log L", "Cinelike D", "Cinelike V", "HLG"];
const panasonicGamuts = ["V-Gamut", "Rec.709", "Rec.2020"];
const blackmagicLogProfiles = ["BMD Film Gen 5", "BMD Film Gen 4", "Extended Video", "Video"];
const blackmagicGamuts = ["Blackmagic Wide Gamut Gen 5", "Blackmagic Design Film", "Rec.709"];
const arriLogProfiles = ["LogC3", "LogC4", "Rec.709 Look"];
const arriGamuts = ["ARRI Wide Gamut 3", "ARRI Wide Gamut 4", "Rec.709"];
const redLogProfiles = ["REDLogFilm", "Log3G10", "IPP2", "Rec.709"];
const redGamuts = ["REDWideGamutRGB", "Rec.709"];
const djiLogProfiles = ["D-Log", "D-Log M", "D-Cinelike", "Normal"];
const djiGamuts = ["D-Gamut", "Rec.709"];
const fujifilmLogProfiles = ["F-Log", "F-Log2", "Eterna", "HLG"];
const fujifilmGamuts = ["F-Gamut", "Rec.709", "Rec.2020"];
const nikonLogProfiles = ["N-Log", "Flat", "HLG", "Standard"];
const nikonGamuts = ["Rec.2020", "Rec.709"];
const appleLogProfiles = ["Apple Log", "HDR", "Standard", "Blackmagic Camera App workflow"];
const appleGamuts = ["Rec.2020", "Display P3", "Rec.709"];

export const cameraLutBrandOptions: readonly CameraLutBrandOption[] = [
  { id: "sony", label: "Sony" },
  { id: "canon", label: "Canon" },
  { id: "panasonic", label: "Panasonic / Lumix" },
  { id: "blackmagic", label: "Blackmagic" },
  { id: "arri", label: "ARRI" },
  { id: "red", label: "RED" },
  { id: "dji", label: "DJI" },
  { id: "fujifilm", label: "Fujifilm" },
  { id: "nikon", label: "Nikon" },
  { id: "apple", label: "Apple / Mobile" }
];

export const cameraLutProfiles: readonly CameraLutSupportProfile[] = [
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "FX3", modelFamily: "Cinema Line", sensorFormat: "full-frame", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: 33, recommendedCubeSize: 33, lutUseType: "monitoring" }),
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "FX30", modelFamily: "Cinema Line", sensorFormat: "aps-c", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: 33, recommendedCubeSize: 33, lutUseType: "monitoring" }),
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "A7S III", modelFamily: "Alpha", sensorFormat: "full-frame", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: 33 }),
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "A7 IV", modelFamily: "Alpha", sensorFormat: "full-frame", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "A7R V", modelFamily: "Alpha", sensorFormat: "full-frame", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "A6700", modelFamily: "Alpha APS-C", sensorFormat: "aps-c", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "sony", brandLabel: "Sony", modelName: "ZV-E1", modelFamily: "ZV", sensorFormat: "full-frame", supportedLogProfiles: sonyLogProfiles, supportedGamuts: sonyGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "canon", brandLabel: "Canon", modelName: "R5 C", modelFamily: "Cinema EOS / EOS R", sensorFormat: "full-frame", supportedLogProfiles: canonLogProfiles, supportedGamuts: canonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "canon", brandLabel: "Canon", modelName: "R5 Mark II", modelFamily: "EOS R", sensorFormat: "full-frame", supportedLogProfiles: canonLogProfiles, supportedGamuts: canonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "canon", brandLabel: "Canon", modelName: "R6 Mark II", modelFamily: "EOS R", sensorFormat: "full-frame", supportedLogProfiles: canonLogProfiles, supportedGamuts: canonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "canon", brandLabel: "Canon", modelName: "C70", modelFamily: "Cinema EOS", sensorFormat: "s35", supportedLogProfiles: canonLogProfiles, supportedGamuts: canonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "canon", brandLabel: "Canon", modelName: "C80", modelFamily: "Cinema EOS", sensorFormat: "full-frame", supportedLogProfiles: canonLogProfiles, supportedGamuts: canonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "canon", brandLabel: "Canon", modelName: "C300 Mark III", modelFamily: "Cinema EOS", sensorFormat: "s35", supportedLogProfiles: canonLogProfiles, supportedGamuts: canonGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "S5 II", modelFamily: "Lumix S", sensorFormat: "full-frame", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: 33 }),
  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "S5 IIX", modelFamily: "Lumix S", sensorFormat: "full-frame", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: 33 }),
  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "S1H", modelFamily: "Lumix S", sensorFormat: "full-frame", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "GH6", modelFamily: "Lumix GH", sensorFormat: "mft", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "GH7", modelFamily: "Lumix GH", sensorFormat: "mft", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "G9 II", modelFamily: "Lumix G", sensorFormat: "mft", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "panasonic", brandLabel: "Panasonic / Lumix", modelName: "S9", modelFamily: "Lumix S", sensorFormat: "full-frame", supportedLogProfiles: panasonicLogProfiles, supportedGamuts: panasonicGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "blackmagic", brandLabel: "Blackmagic", modelName: "Pocket Cinema Camera 4K", modelFamily: "Pocket Cinema Camera", sensorFormat: "mft", supportedLogProfiles: blackmagicLogProfiles, supportedGamuts: blackmagicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "blackmagic", brandLabel: "Blackmagic", modelName: "Pocket Cinema Camera 6K", modelFamily: "Pocket Cinema Camera", sensorFormat: "s35", supportedLogProfiles: blackmagicLogProfiles, supportedGamuts: blackmagicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "blackmagic", brandLabel: "Blackmagic", modelName: "Cinema Camera 6K", modelFamily: "Cinema Camera", sensorFormat: "full-frame", supportedLogProfiles: blackmagicLogProfiles, supportedGamuts: blackmagicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "blackmagic", brandLabel: "Blackmagic", modelName: "PYXIS", modelFamily: "PYXIS", sensorFormat: "full-frame", supportedLogProfiles: blackmagicLogProfiles, supportedGamuts: blackmagicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "blackmagic", brandLabel: "Blackmagic", modelName: "URSA Mini Pro", modelFamily: "URSA", sensorFormat: "s35", supportedLogProfiles: blackmagicLogProfiles, supportedGamuts: blackmagicGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "blackmagic", brandLabel: "Blackmagic", modelName: "URSA Cine", modelFamily: "URSA Cine", sensorFormat: "full-frame", supportedLogProfiles: blackmagicLogProfiles, supportedGamuts: blackmagicGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "arri", brandLabel: "ARRI", modelName: "ALEXA Mini", modelFamily: "ALEXA", sensorFormat: "s35", supportedLogProfiles: arriLogProfiles, supportedGamuts: arriGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "arri", brandLabel: "ARRI", modelName: "ALEXA Mini LF", modelFamily: "ALEXA", sensorFormat: "full-frame", supportedLogProfiles: arriLogProfiles, supportedGamuts: arriGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "arri", brandLabel: "ARRI", modelName: "ALEXA 35", modelFamily: "ALEXA", sensorFormat: "s35", supportedLogProfiles: arriLogProfiles, supportedGamuts: arriGamuts, maxCubeSize: "unknown", recommendedCubeSize: 33 }),

  makeProfile({ brand: "red", brandLabel: "RED", modelName: "KOMODO", modelFamily: "KOMODO", sensorFormat: "s35", supportedLogProfiles: redLogProfiles, supportedGamuts: redGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "red", brandLabel: "RED", modelName: "KOMODO-X", modelFamily: "KOMODO", sensorFormat: "s35", supportedLogProfiles: redLogProfiles, supportedGamuts: redGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "red", brandLabel: "RED", modelName: "V-RAPTOR", modelFamily: "V-RAPTOR", sensorFormat: "full-frame", supportedLogProfiles: redLogProfiles, supportedGamuts: redGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "red", brandLabel: "RED", modelName: "DSMC2 系列", modelFamily: "DSMC2", sensorFormat: "unknown", supportedLogProfiles: redLogProfiles, supportedGamuts: redGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "dji", brandLabel: "DJI", modelName: "Ronin 4D", modelFamily: "Ronin", sensorFormat: "full-frame", supportedLogProfiles: djiLogProfiles, supportedGamuts: djiGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "dji", brandLabel: "DJI", modelName: "Osmo Pocket 3", modelFamily: "Osmo Pocket", sensorFormat: "1-inch", supportedLogProfiles: djiLogProfiles, supportedGamuts: djiGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "dji", brandLabel: "DJI", modelName: "Action 系列", modelFamily: "Osmo Action", sensorFormat: "unknown", supportedLogProfiles: djiLogProfiles, supportedGamuts: djiGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "fujifilm", brandLabel: "Fujifilm", modelName: "X-H2S", modelFamily: "X Series", sensorFormat: "aps-c", supportedLogProfiles: fujifilmLogProfiles, supportedGamuts: fujifilmGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "fujifilm", brandLabel: "Fujifilm", modelName: "X-H2", modelFamily: "X Series", sensorFormat: "aps-c", supportedLogProfiles: fujifilmLogProfiles, supportedGamuts: fujifilmGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "fujifilm", brandLabel: "Fujifilm", modelName: "X-T5", modelFamily: "X Series", sensorFormat: "aps-c", supportedLogProfiles: fujifilmLogProfiles, supportedGamuts: fujifilmGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "fujifilm", brandLabel: "Fujifilm", modelName: "GFX100 II", modelFamily: "GFX", sensorFormat: "medium-format", supportedLogProfiles: fujifilmLogProfiles, supportedGamuts: fujifilmGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "nikon", brandLabel: "Nikon", modelName: "Z6 III", modelFamily: "Z", sensorFormat: "full-frame", supportedLogProfiles: nikonLogProfiles, supportedGamuts: nikonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "nikon", brandLabel: "Nikon", modelName: "Z8", modelFamily: "Z", sensorFormat: "full-frame", supportedLogProfiles: nikonLogProfiles, supportedGamuts: nikonGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "nikon", brandLabel: "Nikon", modelName: "Z9", modelFamily: "Z", sensorFormat: "full-frame", supportedLogProfiles: nikonLogProfiles, supportedGamuts: nikonGamuts, maxCubeSize: "unknown" }),

  makeProfile({ brand: "apple", brandLabel: "Apple / Mobile", modelName: "iPhone Apple Log", modelFamily: "iPhone", sensorFormat: "unknown", supportedLogProfiles: appleLogProfiles, supportedGamuts: appleGamuts, maxCubeSize: "unknown" }),
  makeProfile({ brand: "apple", brandLabel: "Apple / Mobile", modelName: "Blackmagic Camera App workflow", modelFamily: "Mobile App", sensorFormat: "unknown", supportedLogProfiles: appleLogProfiles, supportedGamuts: appleGamuts, maxCubeSize: "unknown" })
];

export const defaultCameraLutProfile = cameraLutProfiles[0];

export const getCameraLutProfilesByBrand = (brand: CameraBrand): readonly CameraLutSupportProfile[] => {
  return cameraLutProfiles.filter((profile) => profile.brand === brand);
};

export const getCameraLutProfileById = (profileId: string): CameraLutSupportProfile => {
  return cameraLutProfiles.find((profile) => profile.id === profileId) ?? defaultCameraLutProfile;
};
