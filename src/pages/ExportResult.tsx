import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Film, Grid3X3, Info, Lightbulb, Palette, Video } from "lucide-react";
import { exportLutMock } from "../services/lutService";
import type { ExportLutResult, RoutePath } from "../types";
import { defaultLutParameters } from "../utils/lutMock";

interface ExportResultProps {
  readonly selectedStyleName: string;
  readonly onNavigate: (path: RoutePath) => void;
}

const getDataLineCount = (precision: string): number => {
  if (precision === "17x17x17") {
    return 4913;
  }

  if (precision === "65x65x65") {
    return 274625;
  }

  return 35937;
};

export const ExportResult = ({ selectedStyleName, onNavigate }: ExportResultProps) => {
  const [result, setResult] = useState<ExportLutResult | null>(null);
  const [message, setMessage] = useState("正在准备导出信息...");
  const precision = result?.precision ?? defaultLutParameters.precision;

  useEffect(() => {
    let isMounted = true;

    const runExport = async () => {
      try {
        const exportResult = await exportLutMock({
          styleName: selectedStyleName.trim().length > 0 ? selectedStyleName : "青橙电影感",
          parameters: defaultLutParameters
        });

        if (isMounted) {
          setResult(exportResult);
          setMessage("基础创意 LUT 导出说明");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "准备导出时发生未知错误。";

        if (isMounted) {
          setMessage(errorMessage);
        }
      }
    };

    void runExport();

    return () => {
      isMounted = false;
    };
  }, [selectedStyleName]);

  return (
    <div className="export-page">
      <header className="export-hero">
        <div className="export-icon-orbit">
          <Film aria-hidden="true" />
        </div>
        <h1>{message}</h1>
        <p>当前导出的是基础创意风格 LUT，适合 Rec.709 / 已还原素材的风格测试，不是相机 Log 技术转换 LUT。</p>
      </header>

      <section className="export-bento">
        <article className="export-info-card glass-panel glow-border">
          <div className="export-info-title">
            <h2>{result?.fileName ?? "studio-preview.cube"}</h2>
            <span>{precision}</span>
          </div>
          <div className="export-metadata-grid">
            <p>
              <span>LUT 名称</span>
              <strong>{selectedStyleName.trim().length > 0 ? selectedStyleName : "青橙电影感"}</strong>
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
              <strong>{getDataLineCount(precision)}</strong>
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
                基础校验通过
              </strong>
            </p>
          </div>
          <div className="export-note creative-lut-note">
            <Info aria-hidden="true" />
            <p>如果素材是 S-Log3 / C-Log / D-Log / V-Log，请先完成基础色彩空间转换和曝光白平衡校正，再叠加本工具导出的创意 LUT。</p>
          </div>
        </article>

        <article className="download-card glass-panel glow-border">
          <button type="button">
            <Download aria-hidden="true" />
            下载 LUT (.cube)
          </button>
          <div>
            <button type="button">
              <FileText aria-hidden="true" />
              查看导入说明
            </button>
            <button type="button">
              <Copy aria-hidden="true" />
              复制使用建议
            </button>
          </div>
        </article>
      </section>

      <section className="export-guides">
        <article className="glass-panel glow-border">
          <div className="guide-title">
            <Video aria-hidden="true" />
            <h2>软件导入提示</h2>
          </div>
          <div className="guide-grid">
            {[
              ["DaVinci Resolve", "建议放在基础校正或 CST 之后的独立节点上，再用节点 Key Output 控制强度。"],
              ["Premiere Pro", "可在 Lumetri Color 的 Creative / Look 或 Input LUT 中加载，建议优先作为风格 Look 使用。"],
              ["剪映", "如果版本支持导入 LUT，可作为风格滤镜使用，并适当降低强度。"],
              ["Final Cut Pro", "通过自带或第三方 LUT 工具加载，建议先完成曝光和白平衡校正。"]
            ].map(([name, description]) => (
              <div className="guide-card" key={name}>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-panel glow-border pro-tip-card">
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

      <nav className="export-bottom-actions">
        <button type="button" onClick={() => onNavigate("/workspace")}>
          <ArrowLeft aria-hidden="true" />
          返回工作台
        </button>
        <button type="button" onClick={() => onNavigate("/workspace")}>
          <Palette aria-hidden="true" />
          继续生成新的 LUT
        </button>
        <button type="button" onClick={() => onNavigate("/styles")}>
          <Grid3X3 aria-hidden="true" />
          浏览更多风格
        </button>
      </nav>
    </div>
  );
};
