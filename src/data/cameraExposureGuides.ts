import type { CameraExposureGuide, SensorFormat } from "../types";

interface ExposureGuideInput {
  readonly cameraModel: string;
  readonly sensorFormat: SensorFormat;
  readonly logProfile: string;
}

const officialPending = "待官方资料确认。不同机型、固件、Log 曲线、监看 LUT 和机内曝光工具会影响实际建议。";

const makeExposureGuide = ({ cameraModel, sensorFormat, logProfile }: ExposureGuideInput): CameraExposureGuide => ({
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
  sourceNeeded: true
});

export const cameraExposureGuides: readonly CameraExposureGuide[] = [
  makeExposureGuide({ cameraModel: "Sony FX3", sensorFormat: "full-frame", logProfile: "S-Log3" }),
  makeExposureGuide({ cameraModel: "Sony FX30", sensorFormat: "aps-c", logProfile: "S-Log3" }),
  makeExposureGuide({ cameraModel: "Sony A7S III", sensorFormat: "full-frame", logProfile: "S-Log3" }),
  makeExposureGuide({ cameraModel: "Canon R5 C", sensorFormat: "full-frame", logProfile: "C-Log3" }),
  makeExposureGuide({ cameraModel: "Canon C70", sensorFormat: "s35", logProfile: "C-Log2" }),
  makeExposureGuide({ cameraModel: "Panasonic S5 IIX", sensorFormat: "full-frame", logProfile: "V-Log" }),
  makeExposureGuide({ cameraModel: "Panasonic GH7", sensorFormat: "mft", logProfile: "V-Log L" }),
  makeExposureGuide({ cameraModel: "Blackmagic Cinema Camera 6K", sensorFormat: "full-frame", logProfile: "BMD Film Gen 5" }),
  makeExposureGuide({ cameraModel: "ARRI ALEXA 35", sensorFormat: "s35", logProfile: "LogC4" }),
  makeExposureGuide({ cameraModel: "RED V-RAPTOR", sensorFormat: "full-frame", logProfile: "Log3G10" }),
  makeExposureGuide({ cameraModel: "DJI Ronin 4D", sensorFormat: "full-frame", logProfile: "D-Log" }),
  makeExposureGuide({ cameraModel: "Fujifilm X-H2S", sensorFormat: "aps-c", logProfile: "F-Log2" }),
  makeExposureGuide({ cameraModel: "Nikon Z8", sensorFormat: "full-frame", logProfile: "N-Log" }),
  makeExposureGuide({ cameraModel: "iPhone Apple Log", sensorFormat: "unknown", logProfile: "Apple Log" })
];
