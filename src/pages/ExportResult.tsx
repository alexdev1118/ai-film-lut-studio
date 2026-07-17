import { useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Film, Grid3X3, Info, Lightbulb, Palette, Video } from "lucide-react";
import { defaultCameraProfile, getCameraProfileById, toInputColorConfig } from "../data/cameraProfiles";
import { useWorkspaceState } from "../state/WorkspaceContext";
import { requestPostLutDownload } from "../services/lutRenderService";
import type { InputColorConfig, LutPrecision, RoutePath } from "../types";
import { defaultLutParameters } from "../utils/lutMock";
import { generateLutFileName, generatePostLutName, sanitizeLookName } from "../utils/lutNaming";
import { getTargetEditorGuide } from "../utils/productWorkflow";

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

const getLutSizeFromPrecision = (precision: LutPrecision): number => {
  if (precision === "17x17x17") {
    return 17;
  }

  return precision === "65x65x65" ? 65 : 33;
};

export const ExportResult = ({ selectedStyleName, onNavigate }: ExportResultProps) => {
  const { lastExportResult, lastCubeDownloadArtifact, setCubeDownloadStatus, lutName, parameters, postCustomFileName, postNamingMode, experienceMode, quickWorkflowPreferences } = useWorkspaceState();
  const [downloadMessage, setDownloadMessage] = useState("");
  const inputColorConfig = readInputColorConfig();
  const selectedProfile = getCameraProfileById(inputColorConfig.profileId);
  const precision = lastExportResult === null ? parameters.precision : getPrecisionFromSize(lastExportResult.lutSize);
  const lookName = sanitizeLookName(lutName || selectedStyleName);
  const autoPostLutName = generatePostLutName({ lookName, lutSize: getLutSizeFromPrecision(precision), namingMode: postNamingMode, inputColorConfig });
  const resolvedPostLutName = postCustomFileName.trim().length > 0 ? sanitizeLookName(postCustomFileName) : autoPostLutName;
  const fileName = lastExportResult?.fileName ?? generateLutFileName(resolvedPostLutName);
  const dataLineCount = lastExportResult?.dataLineCount ?? getDataLineCount(precision);
  const validationPassed = lastExportResult?.isValid ?? true;
  const exportKind = lastExportResult?.exportKind ?? "post-creative";
  const exportTypeCode = lastExportResult?.exportTypeCode ?? "POST";
  const isCameraMonitoring = exportKind === "camera-monitoring";
  const displayLookName = lastExportResult?.lookName ?? lookName;
  const outputColorSpace = lastExportResult?.outputColorSpace ?? "Rec.709";
  const sourceHint = `${lastExportResult?.sourceHintBrand ?? inputColorConfig.brand ?? inputColorConfig.brandId} / ${lastExportResult?.sourceHintGamma ?? inputColorConfig.gamma ?? "Rec.709"}`;
  const hasTechnicalTransform =
    lastExportResult?.technicalTransformFileName !== undefined && lastExportResult.technicalTransformVerification !== "none";
  const diagnostics = lastExportResult?.consistencyDiagnostics;
  const targetEditorGuide = getTargetEditorGuide(quickWorkflowPreferences.targetEditor);
  const handleRedownload = () => {
    if (lastCubeDownloadArtifact === null) {
      setDownloadMessage("当前会话没有可重新下载的已验证文件，请返回工作台生成预览。");
      return;
    }

    try {
      requestPostLutDownload(lastCubeDownloadArtifact);
      setCubeDownloadStatus("requested");
      setDownloadMessage("已再次请求浏览器下载同一份已验证 LUT。");
    } catch (error) {
      setCubeDownloadStatus("blocked");
      setDownloadMessage(error instanceof Error ? error.message : "重新下载失败，请返回工作台重试。");
    }
  };

  return (
    <div className="export-page">
      <header className="export-hero">
        <div className="export-icon-orbit">
          <Film aria-hidden="true" />
        </div>
        <h1>{isCameraMonitoring ? "最近导出的相机监看 LUT" : lastExportResult === null ? "后期软件创意 LUT 导出说明" : "最近导出的后期软件创意 LUT"}</h1>
        <p>{isCameraMonitoring ? "当前导出为相机监看 LUT，处于实验性 / 待官方确认状态，必须在正式拍摄前测试。" : "当前导出的是后期软件创意 LUT，适合 Rec.709 / 已还原素材的风格测试，不是相机 Log 技术转换 LUT。"}</p>
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
              <strong>{displayLookName}</strong>
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
              <strong>{outputColorSpace}</strong>
            </p>
            <p>
              <span>类型</span>
              <strong>{exportTypeCode} / {isCameraMonitoring ? "相机监看 LUT" : "后期软件创意 LUT"}</strong>
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
              <strong>{sourceHint}</strong>
            </p>
            {experienceMode !== "professional" || lastExportResult?.parameterHash === undefined ? null : (
              <p title={lastExportResult.parameterHash}>
                <span>参数 Hash</span>
                <strong>{lastExportResult.parameterHash.slice(0, 12)}</strong>
              </p>
            )}
            {experienceMode !== "professional" || lastExportResult?.cubeHash === undefined ? null : (
              <p title={lastExportResult.cubeHash}>
                <span>Cube Hash</span>
                <strong>{lastExportResult.cubeHash.slice(0, 12)}</strong>
              </p>
            )}
            {experienceMode !== "professional" || lastExportResult?.inputInterpretationHash === undefined ? null : (
              <p title={lastExportResult.inputInterpretationHash}>
                <span>输入解释 Hash</span>
                <strong>{lastExportResult.inputInterpretationHash.slice(0, 12)}</strong>
              </p>
            )}
            {experienceMode !== "professional" || lastExportResult?.inputProfileId === undefined ? null : (
              <p>
                <span>素材输入 Profile</span>
                <strong>{lastExportResult.inputProfileId}</strong>
              </p>
            )}
            {experienceMode !== "professional" || lastExportResult?.outputProfileId === undefined ? null : (
              <p>
                <span>POST 输出 Profile</span>
                <strong>{lastExportResult.outputProfileId}</strong>
              </p>
            )}
            {experienceMode !== "professional" || lastExportResult?.previewDisplayTransformId === undefined ? null : (
              <p>
                <span>网站显示转换</span>
                <strong>{lastExportResult.previewDisplayTransformId}</strong>
              </p>
            )}
            {lastExportResult?.targetMaterialName === undefined ? null : (
              <p>
                <span>目标素材</span>
                <strong>{lastExportResult.targetMaterialName}</strong>
              </p>
            )}
            {lastExportResult?.referenceMaterialName === undefined ? null : (
              <p>
                <span>参考素材</span>
                <strong>{lastExportResult.referenceMaterialName}</strong>
              </p>
            )}
            {experienceMode !== "professional" || diagnostics === undefined ? null : (
              <p>
                <span>Cube 回读一致性</span>
                <strong className={diagnostics.passed ? "success-text" : "upload-error"}>
                  {diagnostics.passed ? "通过" : "未通过"} / 平均误差 {diagnostics.averageRgbError.toFixed(6)}
                </strong>
              </p>
            )}
            {lastExportResult?.targetWasReanalyzed === undefined ? null : (
              <p>
                <span>目标重新分析</span>
                <strong>{lastExportResult.targetWasReanalyzed ? "已针对当前目标应用建议" : "否，参数可能与上一版本相同"}</strong>
              </p>
            )}
            {isCameraMonitoring ? (
              <p>
                <span>核验状态</span>
                <strong>{lastExportResult?.verificationStatus === "verified" ? "已验证" : "TEST / 待官方确认"}</strong>
              </p>
            ) : null}
            {hasTechnicalTransform ? (
              <p>
                <span>技术转换文件</span>
                <strong>{lastExportResult?.technicalTransformFileName}</strong>
              </p>
            ) : null}
            {hasTechnicalTransform ? (
              <p>
                <span>技术转换核验</span>
                <strong>{lastExportResult?.technicalTransformVerification === "verified-official" ? "官方文件哈希已核验" : "用户本地文件 / 未核验"}</strong>
              </p>
            ) : null}
            {lastExportResult?.technicalTransformSourceId === undefined ? null : (
              <p>
                <span>技术转换来源 ID</span>
                <strong>{lastExportResult.technicalTransformSourceId}</strong>
              </p>
            )}
          </div>
          <p className="export-note">{selectedProfile.warning}</p>
        </article>

        <article className="export-info-card glass-panel">
          <div className="guide-title">
            <Info aria-hidden="true" />
            <h2>使用定位</h2>
          </div>
          <p>{isCameraMonitoring ? hasTechnicalTransform ? "当前相机监看 LUT 已按“本地技术转换 → 创意风格 → 监看亮度 → Range”顺序合成；文件未通过登记哈希核验时仍是 TEST。" : "这是相机监看 LUT，当前未绑定技术转换。请先确认相机的导入能力和监看 / 录制行为，再用于实际拍摄。" : "POST LUT 的输入与输出契约均为 Rec.709 / Gamma 2.4 / Full。Log 原片必须先通过 CST、RCM 或厂商技术 LUT 还原，再叠加本 LUT。"}</p>
          <p>{isCameraMonitoring ? "当前机型资料未完成官方核验时，导出名称会包含 TEST；请小范围测试后再用于正式工作。" : "DaVinci 节点 Key Output Gain 建议保持 1.000；可按个人偏好微调，但不应依赖它补救网站与 LUT 强度差异。"}</p>
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
            <h2>{targetEditorGuide.label} 导入步骤</h2>
          </div>
          <p><strong>使用位置</strong><span>{targetEditorGuide.location}</span></p>
          <ol>{targetEditorGuide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="upload-error">常见错误：{targetEditorGuide.commonMistake}</p>
        </article>

        <article className="guide-card glass-panel">
          <div className="guide-title">
            <Lightbulb aria-hidden="true" />
            <h2>常见问题</h2>
          </div>
          <ul>
            <li>网页预览已由最终导出 Cube 回读渲染；按 Rec.709 Gamma 2.4 / Full 契约使用时应与软件接近。若差异明显，请检查节点顺序、Range、显示色彩管理，并将其视为一致性问题。</li>
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
        <button type="button" disabled={lastCubeDownloadArtifact === null} onClick={handleRedownload}>
          <Download aria-hidden="true" />
          重新下载当前 LUT
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
      {downloadMessage.length === 0 ? null : <p className="export-download-message" role="status">{downloadMessage}</p>}
    </div>
  );
};
