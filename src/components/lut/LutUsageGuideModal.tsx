import { useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { BookOpen, CheckCircle2, X } from "lucide-react";
import type { InputColorConfig, LutExportKind, LutExportTypeCode, LutPrecision } from "../../types";
import { Button } from "../ui/Button";

interface LutUsageGuideModalProps {
  readonly isOpen: boolean;
  readonly lutName: string;
  readonly exportKind: LutExportKind;
  readonly exportTypeCode: LutExportTypeCode;
  readonly precision: LutPrecision;
  readonly selectedStyleName: string;
  readonly inputColorConfig: InputColorConfig;
  readonly hasTargetImage: boolean;
  readonly hasReferenceImage: boolean;
  readonly onClose: () => void;
}

const getInputRecommendation = (inputColorConfig: InputColorConfig): string => {
  if (inputColorConfig.inputType === "log") {
    return "当前输入是 Log / 宽色域目录。请先在调色软件中通过项目色彩管理、CST 或厂商官方流程还原到标准显示空间，再叠加本工具的创意 LUT。";
  }

  if (inputColorConfig.inputType === "hdr") {
    return "当前输入属于 HDR 工作流目录。请先完成 HDR 到目标显示空间的转换，再将本 LUT 作为创意风格测试。";
  }

  if (inputColorConfig.inputType === "flat") {
    return "当前输入是 Flat / 低对比目录。建议先完成曝光、白平衡和基础对比校正，再叠加本 LUT。";
  }

  if (inputColorConfig.inputType === "unknown") {
    return "当前输入类型未确认。请先确认素材来源，或先完成基础还原后再测试本 LUT。";
  }

  return "当前输入按 Rec.709 / 标准显示空间工作流处理。建议先完成曝光与白平衡校正，再叠加本 LUT。";
};

export const LutUsageGuideModal = ({
  isOpen,
  lutName,
  exportKind,
  exportTypeCode,
  precision,
  selectedStyleName,
  inputColorConfig,
  hasTargetImage,
  hasReferenceImage,
  onClose
}: LutUsageGuideModalProps) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const isCameraMonitoring = exportKind === "camera-monitoring";
  const guideTitle = isCameraMonitoring ? "相机监看 LUT 使用说明" : "创意 LUT 使用说明";
  const guideDescription = isCameraMonitoring
    ? "当前导出为相机监看 LUT，仍处于实验性 / 待官方确认工作流。"
    : "当前导出为后期软件创意 LUT，不是相机 Log 技术转换 LUT。";

  return (
    <div className="lut-usage-guide-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section aria-label="当前 LUT 使用说明" aria-modal="true" className="lut-usage-guide-modal" role="dialog">
        <header className="lut-usage-guide-header">
          <div>
            <span>
              <BookOpen aria-hidden="true" />
              当前工作流
            </span>
            <h2>{guideTitle}</h2>
            <p>{guideDescription}</p>
          </div>
          <button aria-label="关闭使用说明" className="lut-usage-guide-close" type="button" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="lut-usage-guide-body">
          <div className="lut-usage-guide-summary">
            <p><span>LUT 名称</span><strong>{lutName.trim().length > 0 ? lutName : "未命名 LUT"}</strong></p>
            <p><span>导出类型</span><strong>{exportTypeCode} / {isCameraMonitoring ? "相机监看 LUT" : "后期软件创意 LUT"}</strong></p>
            <p><span>精度</span><strong>{precision}</strong></p>
            <p><span>当前风格</span><strong>{selectedStyleName}</strong></p>
            <p><span>输入目录</span><strong>{inputColorConfig.gamma ?? "Unknown"} / {inputColorConfig.gamut ?? "Unknown"}</strong></p>
          </div>

          <section className="lut-usage-guide-card">
            <h3>当前建议</h3>
            <p>{isCameraMonitoring ? "当前文件用于相机或外接监视器的监看测试。请在正式拍摄前确认相机是否支持该文件格式、点数、Range 与导入路径。不要把它当作后期 Log 技术转换 LUT。" : getInputRecommendation(inputColorConfig)}</p>
          </section>

          <section className="lut-usage-guide-card">
            <h3>推荐顺序</h3>
            <ol>
              {isCameraMonitoring ? (
                <>
                  <li>先在相机或外接监视器中确认可导入该 LUT。</li>
                  <li>以小范围测试检查亮度、高光、肤色与色偏。</li>
                  <li>确认监看 LUT 不会被误用于不可逆录制流程。</li>
                  <li>保留原始曝光与色彩管理工作流，不把本文件视为官方转换 LUT。</li>
                </>
              ) : (
                <>
                  <li>完成基础曝光与白平衡校正。</li>
                  <li>{inputColorConfig.inputType === "log" ? "完成 Log / 色彩空间还原。" : "确认素材已处于目标显示空间。"}</li>
                  <li>在独立节点、Creative / Look 或风格滤镜位置加载本 LUT。</li>
                  <li>根据素材微调 LUT 强度、饱和度、肤色与高光。</li>
                </>
              )}
            </ol>
          </section>

          <section className="lut-usage-guide-card compact">
            <h3>当前工作台状态</h3>
            <ul>
              <li><CheckCircle2 aria-hidden="true" />{hasTargetImage ? "已使用本地目标素材生成预览。" : "当前使用默认目标静帧预览。"}</li>
              <li><CheckCircle2 aria-hidden="true" />{hasReferenceImage ? "已使用自定义参考图参与风格方向。" : "当前使用风格库参考方向。"}</li>
              <li><CheckCircle2 aria-hidden="true" />输入配置：{inputColorConfig.brandLabel ?? "通用"} / {inputColorConfig.profileId}。</li>
            </ul>
          </section>

          <section className="lut-usage-guide-warning">
            <strong>边界说明</strong>
            <p>本工具不会执行 Sony S-Log、Canon C-Log、ARRI LogC、RED Log 等官方技术转换，也不会替代相机厂商的色彩管理流程。</p>
          </section>
        </div>

        <footer className="lut-usage-guide-footer">
          <Button variant="ghost" onClick={onClose}>关闭</Button>
        </footer>
      </section>
    </div>
  );
};
