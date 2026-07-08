import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Film, Grid3X3, Info, Lightbulb, Palette, Video } from "lucide-react";
import { exportLutMock } from "../services/lutService";
import type { ExportLutResult, RoutePath } from "../types";
import { defaultLutParameters } from "../utils/lutMock";

interface ExportResultProps {
  readonly selectedStyleName: string;
  readonly onNavigate: (path: RoutePath) => void;
}

export const ExportResult = ({ selectedStyleName, onNavigate }: ExportResultProps) => {
  const [result, setResult] = useState<ExportLutResult | null>(null);
  const [message, setMessage] = useState("正在准备导出信息...");

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
          setMessage("你的专属 LUT 已生成");
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
        <p>现在你可以下载 .cube 文件，并在剪辑、调色或图片处理流程中继续使用。</p>
      </header>

      <section className="export-bento">
        <article className="export-info-card glass-panel glow-border">
          <div className="export-info-title">
            <h2>{result?.fileName ?? "studio-preview.cube"}</h2>
            <span>{result?.precision ?? defaultLutParameters.precision}</span>
          </div>
          <div className="export-metadata-grid">
            <p>
              <span>选用风格</span>
              <strong>{selectedStyleName.trim().length > 0 ? selectedStyleName : "青橙电影感"}</strong>
            </p>
            <p>
              <span>文件大小</span>
              <strong>{result?.fileSize ?? "准备中"}</strong>
            </p>
            <p>
              <span>输入色彩空间</span>
              <strong>Rec.709</strong>
            </p>
            <p>
              <span>肤色保护</span>
              <strong className="success-text">
                <CheckCircle2 aria-hidden="true" />
                已启用
              </strong>
            </p>
          </div>
          <div className="export-note">
            <Info aria-hidden="true" />
            <p>{result === null ? "系统正在模拟生成 .cube LUT 文件信息。" : `状态：${result.status}。文件已按当前 mock 参数准备完成。`}</p>
          </div>
          <div className="export-note creative-lut-note">
            <Info aria-hidden="true" />
            <p>当前导出的是基础创意风格 LUT，适合 Rec.709 / 标准显示空间风格测试，不等同于 S-Log3、C-Log、D-Log 等专业相机 Log 技术转换 LUT。</p>
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
              下载使用说明
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
            <h2>兼容软件说明</h2>
          </div>
          <div className="guide-grid">
            {["专业调色软件", "剪辑软件", "图片处理软件", "移动剪辑工具"].map((name) => (
              <div className="guide-card" key={name}>
                <h3>{name}</h3>
                <p>导入 .cube 文件后，建议先完成基础曝光和白平衡校正，再以 70%-100% 强度应用当前 LUT。</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-panel glow-border pro-tip-card">
          <div className="guide-title">
            <Lightbulb aria-hidden="true" />
            <h2>专业提示</h2>
          </div>
          <ul>
            <li>Log 素材请先还原到对应标准色彩空间。</li>
            <li>夜景风格可略微压低暗部以增强青橙对比。</li>
            <li>肤色过饱和时，建议降低 LUT 不透明度或使用局部遮罩。</li>
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
