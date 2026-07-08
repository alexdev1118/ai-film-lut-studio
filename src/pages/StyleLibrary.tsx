import { useMemo, useState } from "react";
import { Play, SlidersHorizontal } from "lucide-react";
import { lutStyles, styleCategories } from "../data/styles";
import type { RoutePath, StyleCategory } from "../types";

interface StyleLibraryProps {
  readonly onNavigate: (path: RoutePath, query?: string) => void;
}

export const StyleLibrary = ({ onNavigate }: StyleLibraryProps) => {
  const [activeCategory, setActiveCategory] = useState<StyleCategory>("全部");

  const visibleStyles = useMemo(() => {
    if (activeCategory === "全部") {
      return lutStyles;
    }

    return lutStyles.filter((style) => style.category === activeCategory);
  }, [activeCategory]);

  const handleUseStyle = (styleId: string) => {
    onNavigate("/workspace", `style=${encodeURIComponent(styleId)}`);
  };

  return (
    <div className="style-library-page">
      <header className="style-library-header">
        <h1>选择一个你喜欢的电影风格</h1>
        <p>从经典电影感、港风霓虹、复古胶片、日系清透等内置风格中选择，快速生成专属 LUT。</p>
      </header>
      <div className="category-row">
        {styleCategories.map((category) => (
          <button
            className={activeCategory === category ? "category-button active" : "category-button"}
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="style-grid">
        {visibleStyles.map((style) => (
          <article className="style-card" data-style-id={style.id} key={style.id}>
            <div className="style-preview" style={{ background: style.previewImage }}>
              <span>
                <SlidersHorizontal aria-hidden="true" />
                {style.recommendedIntensity}% 风格强度
              </span>
            </div>
            <div className="style-card-body">
              <div className="style-card-title-row">
                <h3>{style.name}</h3>
                <span>{style.category}</span>
              </div>
              <div className="tag-row">
                {style.keywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
              <p>
                <small>适合场景:</small>
                {style.suitableFor}
              </p>
              <button aria-label={`立即使用 ${style.name}`} type="button" onClick={() => handleUseStyle(style.id)}>
                <Play aria-hidden="true" />
                立即使用
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
