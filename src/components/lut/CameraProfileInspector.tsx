import type { CameraModelRecord } from "../../types/cameraData";

interface CameraProfileInspectorProps {
  readonly model: CameraModelRecord;
}

const formatValue = (value: boolean | number | string | readonly string[]): string => {
  if (Array.isArray(value)) return value.join(" / ");
  if (value === true) return "支持";
  if (value === false) return "不支持";
  return String(value);
};

export const CameraProfileInspector = ({ model }: CameraProfileInspectorProps) => {
  const firmwareScope = model.firmwareScope.map((scope) => scope.exactVersions?.join(" / ") ?? scope.minVersion ?? "未知").join("；");
  const cubeSizes = model.lutCapability.supportedCubeSizes === "unknown" ? "未知" : model.lutCapability.supportedCubeSizes.join(" / ");
  const formats = model.lutCapability.userLutFileFormats === "unknown" ? "未知" : model.lutCapability.userLutFileFormats.join(" / ");

  return (
    <div className="camera-profile-inspector">
      <p><span>产品类别</span><strong>{model.productCategory}</strong></p>
      <p><span>画幅</span><strong>{model.sensorFormat}</strong></p>
      <p><span>用户 LUT 导入</span><strong>{formatValue(model.lutCapability.userLutImport)}</strong></p>
      <p><span>文件格式</span><strong>{formats}</strong></p>
      <p><span>点数</span><strong>{cubeSizes}</strong></p>
      <p><span>槽位</span><strong>{formatValue(model.lutCapability.slotCount)}</strong></p>
      <p><span>固件范围</span><strong title={model.firmwareScope.map((scope) => scope.notes).join("；")}>{firmwareScope}</strong></p>
      <p><span>烘焙录制</span><strong>{formatValue(model.recordingCapability.bakedRecordingSupport)}</strong></p>
    </div>
  );
};
