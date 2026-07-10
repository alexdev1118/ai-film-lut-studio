import type { CameraBrand, CameraExposureGuide, SensorFormat } from "../types";
import { getCameraDataSourceIdsForModel } from "./cameraDataSources";
import { getCameraVerifiedFactIdsForModel } from "./cameraVerifiedFacts";

interface ExposureGuideInput {
  readonly brand: CameraBrand;
  readonly model: string;
  readonly cameraModel: string;
  readonly sensorFormat: SensorFormat;
  readonly logProfile: string;
}

const officialPending = "待官方资料确认。不同机型、固件、Log 曲线、监看 LUT 和机内曝光工具会影响实际建议。";

const makeExposureGuide = ({ brand, model, cameraModel, sensorFormat, logProfile }: ExposureGuideInput): CameraExposureGuide => {
  const sourceIds = getCameraDataSourceIdsForModel(brand, model);
  const verifiedFactIds = getCameraVerifiedFactIdsForModel(brand, model);
  const hasEvidenceRegistry = sourceIds.length > 0;

  return {
    cameraModel,
    sensorFormat,
    logProfile,
    nativeIso: "待官方资料确认",
    recommendedEttr: "待官方资料确认",
    zebraMiddleGray: "待官方资料确认",
    zebraSkinTone: "待官方资料确认",
    whiteClipIre: "待官方资料确认",
    notes: officialPending,
    dataStatus: "needs-official-confirmation",
    ...(hasEvidenceRegistry ? { sourceIds, verifiedFactIds, firmwareScope: ["待按官方固件版本核验"] } : {}),
    confidenceLevel: "unknown",
    sourceNeeded: true
  };
};

export const cameraExposureGuides: readonly CameraExposureGuide[] = [
  makeExposureGuide({ brand: "sony", model: "A6700", cameraModel: "Sony A6700", sensorFormat: "aps-c", logProfile: "S-Log3" }),
  makeExposureGuide({ brand: "sony", model: "FX3", cameraModel: "Sony FX3", sensorFormat: "full-frame", logProfile: "S-Log3" }),
  makeExposureGuide({ brand: "sony", model: "FX30", cameraModel: "Sony FX30", sensorFormat: "aps-c", logProfile: "S-Log3" }),
  makeExposureGuide({ brand: "sony", model: "A7S III", cameraModel: "Sony A7S III", sensorFormat: "full-frame", logProfile: "S-Log3" }),
  makeExposureGuide({ brand: "canon", model: "R5 C", cameraModel: "Canon R5 C", sensorFormat: "full-frame", logProfile: "C-Log3" }),
  makeExposureGuide({ brand: "canon", model: "C70", cameraModel: "Canon C70", sensorFormat: "s35", logProfile: "C-Log2" }),
  makeExposureGuide({ brand: "panasonic", model: "S5 IIX", cameraModel: "Panasonic S5 IIX", sensorFormat: "full-frame", logProfile: "V-Log" }),
  makeExposureGuide({ brand: "panasonic", model: "GH7", cameraModel: "Panasonic GH7", sensorFormat: "mft", logProfile: "V-Log L" }),
  makeExposureGuide({ brand: "blackmagic", model: "Cinema Camera 6K", cameraModel: "Blackmagic Cinema Camera 6K", sensorFormat: "full-frame", logProfile: "BMD Film Gen 5" }),
  makeExposureGuide({ brand: "arri", model: "ALEXA 35", cameraModel: "ARRI ALEXA 35", sensorFormat: "s35", logProfile: "LogC4" }),
  makeExposureGuide({ brand: "red", model: "V-RAPTOR", cameraModel: "RED V-RAPTOR", sensorFormat: "full-frame", logProfile: "Log3G10" }),
  makeExposureGuide({ brand: "dji", model: "Ronin 4D", cameraModel: "DJI Ronin 4D", sensorFormat: "full-frame", logProfile: "D-Log" }),
  makeExposureGuide({ brand: "fujifilm", model: "X-H2S", cameraModel: "Fujifilm X-H2S", sensorFormat: "aps-c", logProfile: "F-Log2" }),
  makeExposureGuide({ brand: "nikon", model: "Z8", cameraModel: "Nikon Z8", sensorFormat: "full-frame", logProfile: "N-Log" }),
  makeExposureGuide({ brand: "apple", model: "iPhone Apple Log", cameraModel: "iPhone Apple Log", sensorFormat: "unknown", logProfile: "Apple Log" })
];
