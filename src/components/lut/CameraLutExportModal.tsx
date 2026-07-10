import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { AlertTriangle, Camera, Download, RotateCcw, X } from "lucide-react";
import {
  cameraLutBrandOptions,
  defaultCameraLutProfile,
  getCameraLutProfileById,
  getCameraLutProfilesByBrand
} from "../../data/cameraLutProfiles";
import type {
  CameraBrand,
  CameraLutCubeSize,
  CameraLutRange,
  CameraLutSupportProfile,
  CameraLutUseType,
  CameraMonitoringExposureConfig,
  CameraMonitoringMode
} from "../../types";
import { generateCameraLutName, sanitizeLutName, type CameraLutNamingMode } from "../../utils/lutNaming";
import { Button } from "../ui/Button";
import { HelpPopover } from "../ui/HelpPopover";
import { SelectControl } from "../ui/SelectControl";
import { lutHelpContent, type LutHelpKey } from "../../data/lutHelpContent";

type RequestedCameraCubeSize = CameraLutCubeSize | "auto";

interface CameraLutExportFormValue {
  readonly lutName: string;
  readonly profile: CameraLutSupportProfile;
  readonly selectedLogProfile: string;
  readonly selectedGamut: string;
  readonly lutUseType: CameraLutUseType;
  readonly requestedCubeSize: RequestedCameraCubeSize;
  readonly range: CameraLutRange;
  readonly exposureConfig: CameraMonitoringExposureConfig;
}

interface CameraLutExportModalProps {
  readonly isOpen: boolean;
  readonly isExporting: boolean;
  readonly onClose: () => void;
  readonly onExport: (value: CameraLutExportFormValue) => Promise<void>;
}

const allLutUseOptions: readonly { readonly value: CameraLutUseType; readonly label: string; readonly description: string }[] = [
  { value: "monitoring", label: "仅监看", description: "LUT 只作为屏幕 / 监视器预览使用。" },
  { value: "monitoring-and-recording", label: "监看并记录", description: "只有官方确认支持烘焙 LUT 的机型才建议使用。" },
  { value: "unknown", label: "未知", description: "仅作目录占位，不作为推荐选项。" }
];

const cubeSizeOptions: readonly { readonly value: string; readonly label: string; readonly description: string }[] = [
  { value: "auto", label: "自动推荐", description: "按当前机型目录推荐点数导出。" },
  { value: "17", label: "17", description: "轻量监看 LUT。" },
  { value: "33", label: "33", description: "默认推荐规格。" },
  { value: "65", label: "65", description: "高点数 LUT，很多相机可能不支持。" }
];

const rangeOptions: readonly { readonly value: CameraLutRange; readonly label: string; readonly description: string }[] = [
  { value: "unknown", label: "自动 / 未知", description: "暂无官方确认，当前按 Full Range 输出。" },
  { value: "full", label: "Full range", description: "保留 0-1 全范围输出。" },
  { value: "legal", label: "Legal range", description: "将 RGB 数值映射到视频 Legal 范围。" }
];

const namingModeOptions: readonly { readonly value: CameraLutNamingMode; readonly label: string; readonly description: string }[] = [
  { value: "simple", label: "简洁命名", description: "品牌_Gamma_点数，例如 Sony_S-Log3_33。" },
  { value: "full", label: "完整命名", description: "品牌_型号_Gamma_EV_点数。" }
];

const monitoringModeOptions: readonly { readonly value: CameraMonitoringMode; readonly label: string; readonly description: string }[] = [
  { value: "standard", label: "标准监看", description: "0 EV，不附加亮度偏移。" },
  { value: "ettr-normalization", label: "ETTR 归一化监看", description: "让向右曝光画面监看时接近正常亮度。" },
  { value: "manual-brightness-offset", label: "手动 LUT 亮度偏移", description: "实验性，直接改变 LUT 显示亮度。" }
];

const ettrTargetOptions: readonly { readonly value: string; readonly label: string; readonly description: string }[] = [
  { value: "1", label: "+1 EV", description: "拍摄目标 +1 EV，LUT 显示归一化 -1 EV。" },
  { value: "2", label: "+2 EV", description: "拍摄目标 +2 EV，LUT 显示归一化 -2 EV。" },
  { value: "3", label: "+3 EV", description: "拍摄目标 +3 EV，LUT 显示归一化 -3 EV。" }
];

const manualBrightnessOptions: readonly { readonly value: string; readonly label: string; readonly description: string }[] = [
  { value: "-3", label: "-3 EV", description: "监看画面变暗。" },
  { value: "-2", label: "-2 EV", description: "监看画面变暗。" },
  { value: "-1", label: "-1 EV", description: "监看画面略暗。" },
  { value: "0", label: "0 EV", description: "不改变亮度。" },
  { value: "1", label: "+1 EV", description: "监看画面略亮。" },
  { value: "2", label: "+2 EV", description: "监看画面变亮。" },
  { value: "3", label: "+3 EV", description: "强亮度偏移，注意高光压缩。" }
];

const getRequestedSize = (value: string): RequestedCameraCubeSize => {
  if (value === "17" || value === "33" || value === "65") {
    return Number(value) as CameraLutCubeSize;
  }

  return "auto";
};

const getResolvedSize = (profile: CameraLutSupportProfile, requestedCubeSize: RequestedCameraCubeSize): CameraLutCubeSize => {
  return requestedCubeSize === "auto" ? profile.recommendedCubeSize ?? 33 : requestedCubeSize;
};

const getExposureConfig = (
  monitoringMode: CameraMonitoringMode,
  ettrTargetEv: number,
  manualBrightnessOffsetEv: number
): CameraMonitoringExposureConfig => {
  if (monitoringMode === "standard") {
    return {
      mode: "standard",
      lutBrightnessOffsetEv: 0
    };
  }

  if (monitoringMode === "ettr-normalization") {
    return {
      mode: "ettr-normalization",
      shootingTargetEv: ettrTargetEv,
      lutBrightnessOffsetEv: -ettrTargetEv
    };
  }

  return {
    mode: "manual-brightness-offset",
    lutBrightnessOffsetEv: manualBrightnessOffsetEv
  };
};

const getExposureModeLabel = (config: CameraMonitoringExposureConfig): string => {
  if (config.mode === "standard") {
    return "标准监看";
  }

  if (config.mode === "ettr-normalization") {
    return "ETTR 归一化监看";
  }

  return "手动 LUT 亮度偏移";
};

const formatEv = (value: number): string => {
  if (value === 0) {
    return "0 EV";
  }

  return value > 0 ? `+${value} EV` : `${value} EV`;
};

interface FieldLabelProps {
  readonly label: string;
  readonly helpKey: LutHelpKey;
}

const FieldLabel = ({ label, helpKey }: FieldLabelProps) => (
  <span className="field-label-with-help">
    {label}
    <HelpPopover content={lutHelpContent[helpKey]} />
  </span>
);

export const CameraLutExportModal = ({ isOpen, isExporting, onClose, onExport }: CameraLutExportModalProps) => {
  const [brandId, setBrandId] = useState<CameraBrand>(defaultCameraLutProfile.brand);
  const [profileId, setProfileId] = useState(defaultCameraLutProfile.id);
  const [selectedLogProfile, setSelectedLogProfile] = useState(defaultCameraLutProfile.supportedLogProfiles[0] ?? "Unknown");
  const [selectedGamut, setSelectedGamut] = useState(defaultCameraLutProfile.supportedGamuts[0] ?? "Unknown");
  const [lutUseType, setLutUseType] = useState<CameraLutUseType>("monitoring");
  const [requestedCubeSize, setRequestedCubeSize] = useState<RequestedCameraCubeSize>("auto");
  const [range, setRange] = useState<CameraLutRange>("unknown");
  const [namingMode, setNamingMode] = useState<CameraLutNamingMode>("simple");
  const [isAutoNaming, setIsAutoNaming] = useState(true);
  const [lutName, setLutName] = useState("");
  const [monitoringMode, setMonitoringMode] = useState<CameraMonitoringMode>("standard");
  const [ettrTargetEv, setEttrTargetEv] = useState(2);
  const [manualBrightnessOffsetEv, setManualBrightnessOffsetEv] = useState(0);

  const brandProfiles = useMemo(() => getCameraLutProfilesByBrand(brandId), [brandId]);
  const selectedProfile = useMemo(() => getCameraLutProfileById(profileId), [profileId]);
  const resolvedSize = getResolvedSize(selectedProfile, requestedCubeSize);
  const exposureConfig = getExposureConfig(monitoringMode, ettrTargetEv, manualBrightnessOffsetEv);
  const autoLutName = useMemo(
    () => generateCameraLutName(selectedProfile, selectedLogProfile, resolvedSize, exposureConfig, namingMode),
    [exposureConfig, namingMode, resolvedSize, selectedLogProfile, selectedProfile]
  );
  const finalLutName = sanitizeLutName(lutName);
  const exceedsMaxSize =
    typeof selectedProfile.maxCubeSize === "number" && requestedCubeSize !== "auto" && requestedCubeSize > selectedProfile.maxCubeSize;
  const lutUseOptions =
    selectedProfile.dataStatus === "verified-official"
      ? allLutUseOptions
      : allLutUseOptions.filter((option) => option.value === "monitoring");
  const nameTooLong = finalLutName.length > 80;

  useEffect(() => {
    if (brandProfiles.length > 0 && !brandProfiles.some((profile) => profile.id === profileId)) {
      setProfileId(brandProfiles[0].id);
    }
  }, [brandProfiles, profileId]);

  useEffect(() => {
    setSelectedLogProfile(selectedProfile.supportedLogProfiles[0] ?? "Unknown");
    setSelectedGamut(selectedProfile.supportedGamuts[0] ?? "Unknown");
    setLutUseType("monitoring");
    setRange(selectedProfile.range ?? "unknown");
  }, [selectedProfile]);

  useEffect(() => {
    if (isAutoNaming) {
      setLutName(autoLutName);
    }
  }, [autoLutName, isAutoNaming]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const restoreAutoNaming = () => {
    setIsAutoNaming(true);
    setLutName(autoLutName);
  };

  const handleNameChange = (value: string) => {
    setIsAutoNaming(false);
    setLutName(sanitizeLutName(value));
  };

  const handleExport = async () => {
    await onExport({
      lutName: finalLutName,
      profile: selectedProfile,
      selectedLogProfile,
      selectedGamut,
      lutUseType,
      requestedCubeSize,
      range,
      exposureConfig
    });
  };

  return (
    <div className="camera-lut-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="camera-lut-modal" aria-label="相机监看 LUT 导出" role="dialog" aria-modal="true">
        <header className="camera-lut-modal-header">
          <div>
            <span className="camera-lut-kicker">
              <Camera aria-hidden="true" />
              相机监看 LUT
            </span>
            <h2>导出相机监看 LUT V1</h2>
            <p>用于部分支持导入 LUT 的相机内监看。当前不是官方技术转换 LUT。</p>
          </div>
          <button className="camera-lut-close" aria-label="关闭相机监看 LUT 导出" type="button" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="camera-lut-modal-body">
          <div className="camera-lut-name-card">
            <div className="camera-lut-name-row">
              <label>
                <FieldLabel helpKey="lutName" label="LUT 名称" />
                <input maxLength={120} value={lutName} onChange={(event) => handleNameChange(event.currentTarget.value)} />
              </label>
              <SelectControl
                label="命名模式"
                options={namingModeOptions}
                value={namingMode}
                onChange={(nextValue) => {
                  setNamingMode(nextValue as CameraLutNamingMode);
                  setIsAutoNaming(true);
                }}
              />
            </div>
            <div className="camera-lut-name-meta">
              <span>{isAutoNaming ? "自动命名" : "自定义命名"}</span>
              <strong>{finalLutName.length > 0 ? `${finalLutName}.cube` : "请输入 LUT 名称"}</strong>
              <button type="button" onClick={restoreAutoNaming}>
                <RotateCcw aria-hidden="true" />
                恢复自动命名
              </button>
            </div>
            {nameTooLong ? <p className="camera-lut-inline-warning">名称较长，建议控制在 80 个字符以内，避免相机导入失败。</p> : null}
          </div>

          <div className="camera-lut-form-grid">
            <SelectControl
              ariaLabel="相机品牌"
              label={<FieldLabel helpKey="cameraBrand" label="相机品牌" />}
              options={cameraLutBrandOptions.map((brand) => ({ value: brand.id, label: brand.label }))}
              value={brandId}
              onChange={(nextValue) => {
                const nextBrandId = nextValue as CameraBrand;
                const nextProfiles = getCameraLutProfilesByBrand(nextBrandId);
                setBrandId(nextBrandId);
                setProfileId(nextProfiles[0]?.id ?? defaultCameraLutProfile.id);
              }}
            />
            <SelectControl
              ariaLabel="相机型号"
              label={<FieldLabel helpKey="cameraModel" label="相机型号" />}
              options={brandProfiles.map((profile) => ({
                value: profile.id,
                label: profile.modelName,
                description: `${profile.modelFamily} / ${profile.sensorFormat ?? "unknown"}`
              }))}
              value={profileId}
              onChange={setProfileId}
            />
            <SelectControl
              ariaLabel="Log 曲线"
              label={<FieldLabel helpKey="logCurve" label="Log 曲线" />}
              options={selectedProfile.supportedLogProfiles.map((profile) => ({ value: profile, label: profile }))}
              value={selectedLogProfile}
              onChange={setSelectedLogProfile}
            />
            <SelectControl
              ariaLabel="Gamut"
              label={<FieldLabel helpKey="gamut" label="Gamut" />}
              options={selectedProfile.supportedGamuts.map((gamut) => ({ value: gamut, label: gamut }))}
              value={selectedGamut}
              onChange={setSelectedGamut}
            />
            <SelectControl
              ariaLabel="LUT 用途"
              label={<FieldLabel helpKey="lutUse" label="LUT 用途" />}
              options={lutUseOptions}
              value={lutUseType}
              onChange={(nextValue) => setLutUseType(nextValue as CameraLutUseType)}
            />
            <SelectControl
              ariaLabel="LUT 点数"
              label={<FieldLabel helpKey="lutCubeSize" label="LUT 点数" />}
              options={cubeSizeOptions.map((option) =>
                option.value === "auto" ? { ...option, label: `自动推荐（${selectedProfile.recommendedCubeSize ?? 33} 点）` } : option
              )}
              value={requestedCubeSize === "auto" ? "auto" : `${requestedCubeSize}`}
              onChange={(nextValue) => setRequestedCubeSize(getRequestedSize(nextValue))}
            />
            <SelectControl
              ariaLabel="Range"
              label={<FieldLabel helpKey="range" label="Range" />}
              options={rangeOptions}
              value={range}
              onChange={(nextValue) => setRange(nextValue as CameraLutRange)}
            />
            <SelectControl
              ariaLabel="监看亮度模式"
              label={<FieldLabel helpKey="monitoringMode" label="监看亮度模式" />}
              options={monitoringModeOptions}
              value={monitoringMode}
              onChange={(nextValue) => setMonitoringMode(nextValue as CameraMonitoringMode)}
            />
            {monitoringMode === "ettr-normalization" ? (
              <SelectControl
                ariaLabel="拍摄曝光目标"
                label={<FieldLabel helpKey="shootingExposureTarget" label="拍摄曝光目标" />}
                options={ettrTargetOptions}
                value={`${ettrTargetEv}`}
                onChange={(nextValue) => setEttrTargetEv(Number(nextValue))}
              />
            ) : null}
            {monitoringMode === "manual-brightness-offset" ? (
              <SelectControl
                ariaLabel="手动亮度偏移"
                label={<FieldLabel helpKey="manualBrightnessOffset" label="手动亮度偏移" />}
                options={manualBrightnessOptions}
                value={`${manualBrightnessOffsetEv}`}
                onChange={(nextValue) => setManualBrightnessOffsetEv(Number(nextValue))}
              />
            ) : null}
          </div>

          <div className="camera-lut-profile-summary">
            <p>
              <FieldLabel helpKey="sensorFormat" label="传感器 / 画幅" />
              <strong>{selectedProfile.sensorFormat ?? "unknown"}</strong>
            </p>
            <p>
              <span>推荐点数</span>
              <strong>{selectedProfile.recommendedCubeSize ?? 33}</strong>
            </p>
            <p>
              <FieldLabel helpKey="resolvedCubeSize" label="最终导出点数" />
              <strong>{resolvedSize}</strong>
            </p>
            <p>
              <span>最大点数</span>
              <strong>{selectedProfile.maxCubeSize ?? "待官方确认"}</strong>
            </p>
            <p>
              <FieldLabel helpKey="dataStatus" label="数据状态" />
              <strong>{selectedProfile.dataStatus === "verified-official" ? "官方已确认" : "待官方确认"}</strong>
            </p>
          </div>

          <div className="camera-lut-config-summary">
            <p>
              <span>导出类型</span>
              <strong>相机监看 LUT</strong>
            </p>
            <p>
              <span>相机</span>
              <strong>{selectedProfile.brandLabel} {selectedProfile.modelName}</strong>
            </p>
            <p>
              <span>输入</span>
              <strong>{selectedLogProfile} / {selectedGamut}</strong>
            </p>
            <p>
              <span>用途</span>
              <strong>{lutUseOptions.find((option) => option.value === lutUseType)?.label ?? "仅监看"}</strong>
            </p>
            <p>
              <span>监看模式</span>
              <strong>{getExposureModeLabel(exposureConfig)}</strong>
            </p>
            <p>
              <span>LUT 亮度偏移</span>
              <strong>{formatEv(exposureConfig.lutBrightnessOffsetEv)}</strong>
            </p>
            <p>
              <span>Range</span>
              <strong>{range === "legal" ? "Legal range（真实映射）" : range === "full" ? "Full range" : "自动 / 未知（当前按 Full 输出）"}</strong>
            </p>
            <p>
              <span>文件名</span>
              <strong>{finalLutName.length > 0 ? `${finalLutName}.cube` : "未命名"}</strong>
            </p>
          </div>

          <div className={exceedsMaxSize ? "camera-lut-risk-card danger" : "camera-lut-risk-card"}>
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>{exceedsMaxSize ? "当前点数超过机型目录限制" : "导出前风险提示"}</strong>
              <ul>
                <li>不是所有相机都支持导入自定义 LUT。</li>
                <li>未官方确认机型默认只允许“仅监看”；是否支持烘焙进素材尚未确认。</li>
                <li>当前最大点数如为目录临时约束，尚未通过官方资料确认。</li>
                <li>正式拍摄前必须在相机里测试：能否导入、是否偏色、是否过曝、是否影响监看或录制。</li>
              </ul>
            </div>
          </div>

          <div className="camera-lut-note-grid">
            <p>
              <span>EV 语义</span>
              <strong>
                {exposureConfig.mode === "ettr-normalization"
                  ? `拍摄目标 ${formatEv(exposureConfig.shootingTargetEv ?? 0)}，LUT 显示归一化 ${formatEv(exposureConfig.lutBrightnessOffsetEv)}。`
                  : exposureConfig.mode === "manual-brightness-offset"
                    ? `实验性：直接让监看画面 ${exposureConfig.lutBrightnessOffsetEv > 0 ? "变亮" : exposureConfig.lutBrightnessOffsetEv < 0 ? "变暗" : "不变"}。`
                    : "标准监看：不附加亮度偏移。"}
              </strong>
            </p>
            <p>
              <span>说明</span>
              <strong>监看亮度模式不会改变相机实际曝光；ETTR / EI / Zebra 建议需后续按机型官方资料补充。</strong>
            </p>
          </div>
        </div>

        <footer className="camera-lut-modal-footer">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button disabled={isExporting || exceedsMaxSize || finalLutName.length === 0} onClick={handleExport}>
            <Download aria-hidden="true" />
            {isExporting ? "正在导出..." : "导出相机监看 LUT"}
          </Button>
        </footer>
      </section>
    </div>
  );
};
