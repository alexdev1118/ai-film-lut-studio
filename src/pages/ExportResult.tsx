import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Film, Grid3X3, Info, Lightbulb, Palette, Video } from "lucide-react";
import { defaultCameraProfile, getCameraProfileById, toInputColorConfig } from "../data/cameraProfiles";
import { useWorkspaceState } from "../state/WorkspaceContext";
import type { InputColorConfig, LutPrecision, RoutePath } from "../types";
import { defaultLutParameters } from "../utils/lutMock";

interface ExportResultProps {
  readonly selectedStyleName: string;
  readonly onNavigate: (path: RoutePath) => void;
}

const inputColorConfigStorageKey = "ai-film-lut-studio-input-color-config";

const getDataLineCount = (precision: LutPrecision): number => {
  if (precision === "17x17x17") {
    return 4913;
  }

  if (precision === "65x65x65") {
    return 274625;
  }

  return 35937;
};

const readInputColorConfig = (): InputColorConfig => {
  try {
    const rawValue = window.localStorage.getItem(inputColorConfigStorageKey);

    if (rawValue === null) {
      return toInputColorConfig(defaultCameraProfile);
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (typeof parsedValue === "object" && parsedValue !== null && "profileId" in parsedValue && typeof parsedValue.profileId === "string") {
      return toInputColorConfig(getCameraProfileById(parsedValue.profileId));
    }
  } catch (error) {
    console.warn("读取输入素材配置失败", error);
  }

  return toInputColorConfig(defaultCameraProfile);
};

const getPrecisionFromSize = (lutSize: number): LutPrecision => {
  if (lutSize === 17) {
    return "17x17x17";
  }

  if (lutSize === 65) {
    return "65x65x65";
  }

  return "33x33x33";
};

export const ExportResult = ({ selectedStyleName, onNavigate }: ExportResultProps) => {
  const { lastExportResult, lutName, parameters } = useWorkspaceState();
  const inputColorConfig = readInputColorConfig();
  const selectedProfile = getCameraProfileById(inputColorConfig.profileId);
  const precision = lastExportResult === null ? parameters.precision : getPrecisionFromSize(lastExportResult.lutSize);
  const fileName = lastExportResult?.fileName ?? `${lutName || selectedStyleName || "AI_Film_LUT_Studio"}.cube`;
  const dataLineCount = lastExportResult?.dataLineCount ?? getDataLineCount(precision);
  const validationPassed = lastExportResult?.isValid ?? true;

  return (
    <div className="export-page">
      <header className="export-hero">
        <div className="export-icon-orbit">
          <Film aria-hidden="true" />
        </div>
        <h1>{lastExportResult === null ? "基础创意 LUT 导出说明" : "最近导出的基础创意 LUT"}</h1>
        <p>当前导出的是基础创意风格 LUT，适合 Rec.709 / 已还原素材的风格测试，不是相机 Log 技术转换 LUT。</p>
      </header>

      <section className="export-bento">
        <article className="export-info-card glass-panel glow-border">
          <div className="export-info-title">
            <h2>{fileName}</h2>
            <span>{precision}</span>
          </div>
          <div className="export-metadata-grid">
            <p>
              <span>LUT 名称</span>
              <strong>{lutName}</strong>
            </p>
            <p>
              <span>文件格式</span>
              <strong>.cube</strong>
            </p>
            <p>
              <span>LUT 精度</span>
              <strong>{precision.replaceAll("x", " / ")}</strong>
            </p>
            <p>
              <span>数据行数</span>
              <strong>{dataLineCount}</strong>
            </p>
            <p>
              <span>输入假设</span>
              <strong>Rec.709 / 标准显示空间</strong>
            </p>
            <p>
              <span>类型</span>
              <strong>基础创意风格 LUT</strong>
            </p>
            <p>
              <span>格式校验</span>
              <strong className="success-text">
                <CheckCircle2 aria-hidden="true" />
                {validationPassed ? "基础校验通过" : "等待重新校验"}
              </strong>
            </p>
            <p>
              <span>输入素材配置</span>
              <strong>
                {inputColorConfig.brand ?? inputColorConfig.brandId} / {inputColorConfig.gamma ?? "Rec.709"} / {inputColorConfig.gamut ?? "Rec.709"}
              </strong>
            </p>
          </div>
          <p className="export-note">{selectedProfile.warning}</p>
        </article>

        <article className="export-info-card glass-panel">
          <div className="guide-title">
            <Info aria-hidden="true" />
            <h2>使用定位</h2>
          </div>
          <p>当前 LUT 适合用于 Rec.709 或已还原素材。如果是 S-Log3 / C-Log / D-Log / V-Log 等素材，建议先完成基础色彩空间转换，再叠加本 LUT。</p>
          <p>它不是 Sony S-Log3、Canon C-Log、DJI D-Log 等相机 Log 的技术转换 LUT。</p>
        </article>
      </section>

      <section className="export-guides">
        <article className="guide-card glass-panel">
          <div className="guide-title">
            <Grid3X3 aria-hidden="true" />
            <h2>输入素材配置</h2>
          </div>
          <div className="export-metadata-grid compact">
            {[
              ["相机品牌", inputColorConfig.brand ?? inputColorConfig.brandId],
              ["Gamma", inputColorConfig.gamma ?? "Rec.709"],
              ["Gamut", inputColorConfig.gamut ?? "Rec.709"],
              ["输入类型", inputColorConfig.inputType],
              ["推荐方式", inputColorConfig.recommendedWorkflow]
            ].map(([label, value]) => (
              <p key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </div>
          {inputColorConfig.inputType === "log" ? <p className="upload-error">请勿将本 LUT 当作 Log 技术转换 LUT 使用。建议先还原到 Rec.709，再叠加本 LUT。</p> : null}
        </article>

        <article className="guide-card glass-panel">
          <div className="guide-title">
            <Video aria-hidden="true" />
            <h2>软件导入提示</h2>
          </div>
          {[
            ["DaVinci Resolve", "建议放在基础校正或 CST 之后的独立节点上。"],
            ["Premiere Pro", "可在 Lumetri Color 的 Creative / Look 或 Input LUT 中加载，建议优先作为风格 Look 使用。"],
            ["剪映", "如果版本支持导入 LUT，可作为风格滤镜使用，并适当降低强度。"],
            ["Final Cut Pro", "通过自带或第三方 LUT 工具加载，建议先完成曝光和白平衡校正。"]
          ].map(([name, description]) => (
            <p key={name}>
              <strong>{name}</strong>
              <span>{description}</span>
            </p>
          ))}
        </article>

        <article className="guide-card glass-panel">
          <div className="guide-title">
            <Lightbulb aria-hidden="true" />
            <h2>常见问题</h2>
          </div>
          <ul>
            <li>网页预览和软件效果可能因色彩管理、播放器显示转换、LUT 插值方式不同而不完全一致。</li>
            <li>Log 素材直接套创意 LUT 会偏灰或偏色，因为它还没有转换到标准显示空间。</li>
            <li>建议先校正曝光和白平衡，再使用创意 LUT，否则 LUT 会放大原素材的曝光或色偏问题。</li>
          </ul>
        </article>
      </section>

      <div className="export-bottom-actions">
        <button type="button" onClick={() => onNavigate("/workspace")}>
          <ArrowLeft aria-hidden="true" />
          返回工作台
        </button>
        <button type="button" onClick={() => onNavigate("/workspace")}>
          <Download aria-hidden="true" />
          继续导出 LUT
        </button>
        <button type="button" onClick={() => onNavigate("/styles")}>
          <Palette aria-hidden="true" />
          查看风格库
        </button>
        <button type="button">
          <Copy aria-hidden="true" />
          复制文件名
        </button>
        <button type="button">
          <FileText aria-hidden="true" />
          使用说明
        </button>
      </div>
    </div>
  );
};
