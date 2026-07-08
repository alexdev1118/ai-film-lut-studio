import type { CSSProperties } from "react";
import { Download, Grid3X3, Palette, SlidersHorizontal, Sparkles, SplitSquareHorizontal } from "lucide-react";
import type { RoutePath } from "../types";
import { Button } from "../components/ui/Button";
import { previewImages } from "../data/mockImages";

interface HomeProps {
  readonly onNavigate: (path: RoutePath) => void;
}

export const Home = ({ onNavigate }: HomeProps) => {
  return (
    <div className="home-page">
      <section className="tool-entry">
        <div className="tool-entry-copy">
          <p className="eyebrow">AI 调色工作台</p>
          <h1>上传参考图，一键生成你的电影感 LUT</h1>
          <p>
            AI Film LUT Studio 面向视频创作者和调色新手，帮助你把参考图的色彩、影调和对比度转化为可预览、可微调、可导出的 .cube LUT。
          </p>
          <div className="hero-actions">
            <Button onClick={() => onNavigate("/workspace")}>开始生成 LUT</Button>
            <Button variant="secondary" onClick={() => onNavigate("/styles")}>
              查看风格库
            </Button>
          </div>
        </div>
        <div className="home-workbench-card" aria-label="工作台预览卡片">
          <div className="home-workbench-top">
            <span>
              <Sparkles aria-hidden="true" />
              AI 就绪
            </span>
            <button type="button">导出 LUT</button>
          </div>
          <div className="home-workbench-grid">
            <div className="mini-panel">
              <p>
                <SplitSquareHorizontal aria-hidden="true" />
                目标图
              </p>
              <div className="mini-image target" style={{ background: previewImages.sourceFrame }} />
            </div>
            <div className="mini-panel">
              <p>
                <Palette aria-hidden="true" />
                参考图
              </p>
              <div className="mini-image reference" style={{ background: previewImages.neonHarbor }} />
            </div>
            <div className="mini-panel result-panel">
              <p>
                <Download aria-hidden="true" />
                仿色结果
              </p>
              <div className="mini-image result" style={{ background: previewImages.tealOrange }} />
            </div>
          </div>
          <div className="home-slider-list">
            <span style={{ "--value": "72%" } as CSSProperties}>
              <SlidersHorizontal aria-hidden="true" />
              风格强度
            </span>
            <span style={{ "--value": "54%" } as CSSProperties}>
              <SlidersHorizontal aria-hidden="true" />
              对比度
            </span>
            <span style={{ "--value": "62%" } as CSSProperties}>
              <Grid3X3 aria-hidden="true" />
              阴影匹配
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
