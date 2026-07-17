import { useMemo, useState } from "react";
import { Columns3, Heart, Info, Play, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { lutStyles, styleCategories } from "../data/styles";
import stylePreviewManifest from "../data/stylePreviewManifest.json";
import type { LutStyle, RoutePath, StyleCategory } from "../types";
import type { LutStyleStrength } from "../types/lutStyles";
import { createStyleWorkspaceQuery } from "../utils/styleSelection";

interface StyleLibraryProps {
  readonly onNavigate: (path: RoutePath, query?: string) => void;
}

const favoriteStorageKey = "ai-film-lut-studio-style-favorites";
const recentStorageKey = "ai-film-lut-studio-style-recents";

const readStoredStyleIds = (key: string): readonly string[] => {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return [];
    }
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }
    return parsedValue.filter((value): value is string => typeof value === "string" && lutStyles.some((style) => style.id === value));
  } catch (error) {
    console.warn(`读取风格库状态失败：${key}`, error);
    return [];
  }
};

const persistStyleIds = (key: string, values: readonly string[]): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch (error) {
    console.warn(`保存风格库状态失败：${key}`, error);
  }
};

const provenanceLabel: Record<LutStyle["provenance"]["type"], string> = {
  "verified-official-technical": "官方技术转换",
  "verified-open-creative": "已核验开放创意",
  "original-authored": "本项目原创",
  "inspired-by-public-characteristics": "公开特征启发原创",
  experimental: "实验性"
};

const riskLabel: Record<LutStyle["riskProfile"]["level"], string> = {
  low: "低风险",
  medium: "中等风险",
  high: "高风险"
};

export const StyleLibrary = ({ onNavigate }: StyleLibraryProps) => {
  const [activeCategory, setActiveCategory] = useState<StyleCategory>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>(() => readStoredStyleIds(favoriteStorageKey));
  const [recentIds, setRecentIds] = useState<readonly string[]>(() => readStoredStyleIds(recentStorageKey));
  const [selectedStyle, setSelectedStyle] = useState<LutStyle | null>(null);
  const [previewStrength, setPreviewStrength] = useState<LutStyleStrength>(50);
  const [unavailablePreviewIds, setUnavailablePreviewIds] = useState<ReadonlySet<string>>(() => new Set());
  const [compareIds, setCompareIds] = useState<readonly string[]>([]);
  const [compareStrength, setCompareStrength] = useState<LutStyleStrength>(50);
  const [compareMessage, setCompareMessage] = useState("选择 2 至 4 个风格进行同图比较");

  const comparedStyles = useMemo(
    () => compareIds.map((styleId) => lutStyles.find((style) => style.id === styleId)).filter((style): style is LutStyle => style !== undefined),
    [compareIds]
  );

  const selectedManifestEntry = useMemo(
    () => selectedStyle === null ? undefined : stylePreviewManifest.entries.find((entry) => entry.styleId === selectedStyle.id && entry.strength === previewStrength),
    [previewStrength, selectedStyle]
  );

  const visibleStyles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return lutStyles.filter((style) => {
      const categoryMatches = activeCategory === "全部" || style.category === activeCategory;
      const searchableText = [style.name, style.englishName, style.category, style.description, style.suitableFor, ...style.keywords]
        .join(" ")
        .toLocaleLowerCase();
      return categoryMatches && (normalizedQuery.length === 0 || searchableText.includes(normalizedQuery));
    });
  }, [activeCategory, searchQuery]);

  const handleUseStyle = (style: LutStyle, strength: LutStyleStrength = style.recommendedIntensity) => {
    const nextRecentIds = [style.id, ...recentIds.filter((id) => id !== style.id)].slice(0, 6);
    setRecentIds(nextRecentIds);
    persistStyleIds(recentStorageKey, nextRecentIds);
    onNavigate("/workspace", createStyleWorkspaceQuery(style.id, strength));
  };

  const handleFavorite = (styleId: string) => {
    const nextFavoriteIds = favoriteIds.includes(styleId) ? favoriteIds.filter((id) => id !== styleId) : [...favoriteIds, styleId];
    setFavoriteIds(nextFavoriteIds);
    persistStyleIds(favoriteStorageKey, nextFavoriteIds);
  };

  const openDetails = (style: LutStyle) => {
    setSelectedStyle(style);
    setPreviewStrength(style.recommendedIntensity);
  };

  const toggleCompareStyle = (styleId: string): void => {
    if (compareIds.includes(styleId)) {
      const nextIds = compareIds.filter((id) => id !== styleId);
      setCompareIds(nextIds);
      setCompareMessage(nextIds.length < 2 ? "再选一个风格即可开始比较" : `正在比较 ${nextIds.length} 个风格`);
      return;
    }

    if (compareIds.length >= 4) {
      setCompareMessage("最多同时比较 4 个风格，请先移除一个候选");
      return;
    }

    const nextIds = [...compareIds, styleId];
    setCompareIds(nextIds);
    setCompareMessage(nextIds.length < 2 ? "再选一个风格即可开始比较" : `正在比较 ${nextIds.length} 个风格`);
  };

  const handlePreviewError = (styleId: string) => {
    setUnavailablePreviewIds((current) => {
      if (current.has(styleId)) {
        return current;
      }
      return new Set([...current, styleId]);
    });
  };

  return (
    <div className="style-library-page">
      <header className="style-library-header">
        <div className="style-library-kicker"><ShieldCheck aria-hidden="true" /> 原创可追溯风格库</div>
        <h1>选择你的创意调色方向</h1>
        <p>全部风格基于统一 RGB Core 生成，输入与输出契约均为 Rec.709 / Gamma 2.4 / Full；不包含相机 Log 技术转换。</p>
      </header>

      <div className="style-library-toolbar">
        <label className="style-search-control">
          <Search aria-hidden="true" />
          <span className="sr-only">搜索风格</span>
          <input value={searchQuery} placeholder="搜索名称、标签或场景" onChange={(event) => setSearchQuery(event.target.value)} />
        </label>
        <div className="style-library-stats" aria-label="风格库状态">
          <span>{visibleStyles.length} 个结果</span>
          <span>{favoriteIds.length} 个收藏</span>
          <span>{recentIds.length} 个最近使用</span>
        </div>
      </div>

      <div className="category-row" aria-label="风格分类">
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

      <section className="style-compare-panel" aria-label="风格并排比较">
        <header>
          <div><Columns3 aria-hidden="true" /><span><strong>同图比较</strong><small>{compareMessage}</small></span></div>
          <div className="style-compare-strength" aria-label="统一比较强度">
            {[35, 50, 70, 100].map((strength) => (
              <button className={compareStrength === strength ? "active" : ""} key={strength} type="button" onClick={() => setCompareStrength(strength === 35 || strength === 50 || strength === 70 ? strength : 100)}>{strength}%</button>
            ))}
          </div>
        </header>
        {comparedStyles.length === 0 ? (
          <div className="style-compare-empty">点击风格卡片中的“加入比较”，这里会用同一张原创校准图显示真实 Cube 输出。</div>
        ) : (
          <div className={`style-compare-grid count-${comparedStyles.length}`}>
            {comparedStyles.map((style) => (
              <article key={style.id}>
                <img src={`/style-previews/${style.id}-${compareStrength}.png`} alt={`${style.name} ${compareStrength}% 同图比较`} />
                <div><span><strong>{style.name}</strong><small>{riskLabel[style.riskProfile.level]} · {compareStrength}%</small></span><button type="button" aria-label={`移除 ${style.name}`} onClick={() => toggleCompareStyle(style.id)}><X aria-hidden="true" /></button></div>
                <button className="style-compare-use" type="button" onClick={() => handleUseStyle(style, compareStrength)}>带入工作台</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {visibleStyles.length === 0 ? (
        <div className="style-empty-state">没有找到匹配风格，请调整关键词或分类。</div>
      ) : (
        <div className="style-grid">
          {visibleStyles.map((style) => {
            const isFavorite = favoriteIds.includes(style.id);
            const isRecent = recentIds.includes(style.id);
            const previewUnavailable = unavailablePreviewIds.has(style.id);
            return (
              <article className="style-card" data-style-id={style.id} key={style.id}>
                <div className="style-preview">
                  <button className="style-preview-button" type="button" aria-label={`查看 ${style.name} 风格详情`} onClick={() => openDetails(style)}>
                    {previewUnavailable ? (
                      <span className="style-preview-unavailable">预览资源暂不可用，仍可查看参数与带入工作台</span>
                    ) : (
                      <>
                        <img src={style.previewSet.calibration} alt={`${style.name} 本地 Cube 校准预览`} onError={() => handlePreviewError(style.id)} />
                        <span><SlidersHorizontal aria-hidden="true" />{style.recommendedIntensity}% 推荐强度</span>
                      </>
                    )}
                  </button>
                  <button
                    className={isFavorite ? "style-favorite-button active" : "style-favorite-button"}
                    type="button"
                    aria-label={isFavorite ? `取消收藏 ${style.name}` : `收藏 ${style.name}`}
                    onClick={() => handleFavorite(style.id)}
                  >
                    <Heart aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="style-card-body">
                  <div className="style-card-title-row">
                    <div>
                      <button className="style-title-button" type="button" onClick={() => openDetails(style)}>{style.name}</button>
                      <small>{style.englishName}</small>
                    </div>
                    <span>{style.category}</span>
                  </div>
                  <div className="tag-row">
                    {style.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                  </div>
                  <p><small>适合场景</small>{style.suitableFor}</p>
                  <div className="style-card-meta">
                    <span>{provenanceLabel[style.provenance.type]}</span>
                    <span className={`style-risk-${style.riskProfile.level}`}>{riskLabel[style.riskProfile.level]}</span>
                    {isRecent ? <span>最近使用</span> : null}
                  </div>
                  <div className="style-card-actions">
                    <button className={compareIds.includes(style.id) ? "style-compare-button active" : "style-compare-button"} type="button" onClick={() => toggleCompareStyle(style.id)}><Columns3 aria-hidden="true" />{compareIds.includes(style.id) ? "已比较" : "比较"}</button>
                    <button className="style-detail-button" type="button" onClick={() => openDetails(style)}><Info aria-hidden="true" />详情</button>
                    <button className="style-use-button" type="button" onClick={() => handleUseStyle(style)}><Play aria-hidden="true" />立即使用</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedStyle !== null ? (
        <div className="style-detail-backdrop" role="presentation" onMouseDown={() => setSelectedStyle(null)}>
          <section className="style-detail-modal" role="dialog" aria-modal="true" aria-labelledby="style-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>{selectedStyle.category} · {provenanceLabel[selectedStyle.provenance.type]}</span>
                <h2 id="style-detail-title">{selectedStyle.name}</h2>
                <p>{selectedStyle.description}</p>
              </div>
              <button type="button" aria-label="关闭风格详情" onClick={() => setSelectedStyle(null)}><X aria-hidden="true" /></button>
            </header>
            <div className="style-detail-content">
              <div className="style-detail-preview">
                <img src={`/style-previews/${selectedStyle.id}-${previewStrength}.png`} alt={`${selectedStyle.name} ${previewStrength}% 强度 Cube 预览`} />
                <div className="style-strength-selector" aria-label="预览强度">
                  {selectedStyle.compatibility.strengths.map((strength) => (
                    <button className={previewStrength === strength ? "active" : ""} key={strength} type="button" onClick={() => setPreviewStrength(strength)}>{strength}%</button>
                  ))}
                </div>
              </div>
              <div className="style-detail-facts">
                <dl>
                  <div><dt>输入契约</dt><dd>Rec.709 / Gamma 2.4 / Full</dd></div>
                  <div><dt>输出契约</dt><dd>Rec.709 / Gamma 2.4 / Full</dd></div>
                  <div><dt>Cube 点数</dt><dd>17 / 33 / 65</dd></div>
                  <div><dt>许可</dt><dd>{selectedStyle.license.identifier}</dd></div>
                  <div><dt>风险</dt><dd>{riskLabel[selectedStyle.riskProfile.level]}</dd></div>
                  <div><dt>参数 Hash</dt><dd>{selectedManifestEntry?.parameterHash ?? "未生成"}</dd></div>
                  <div><dt>Cube Hash</dt><dd>{selectedManifestEntry?.cubeHash ?? "未生成"}</dd></div>
                </dl>
                <div className="style-provenance-note">
                  <strong>来源声明</strong>
                  <p>{selectedStyle.provenance.statement}</p>
                </div>
                <div className="style-risk-note">
                  <strong>使用边界</strong>
                  {selectedStyle.riskProfile.risks.map((risk) => <p key={risk}>{risk}</p>)}
                </div>
              </div>
            </div>
            <section className="style-scene-preview-section" aria-label="六场景压力预览">
              <div className="style-scene-preview-heading">
                <div>
                  <strong>六场景压力预览</strong>
                  <p>推荐强度 {selectedStyle.recommendedIntensity}% · 最终 Cube 本地生成</p>
                </div>
                <span>程序化验证图，不是真实媒体</span>
              </div>
              <div className="style-scene-preview-grid">
                {selectedStyle.previewSet.scenes.map((scene) => (
                  <figure key={scene.sceneId}>
                    <img src={scene.image} alt={`${selectedStyle.name} ${scene.label} 程序化压力预览`} />
                    <figcaption>{scene.label}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
            <footer>
              <button className="style-detail-secondary" type="button" onClick={() => handleFavorite(selectedStyle.id)}><Heart aria-hidden="true" />{favoriteIds.includes(selectedStyle.id) ? "取消收藏" : "收藏"}</button>
              <button className="style-detail-primary" type="button" onClick={() => handleUseStyle(selectedStyle, previewStrength)}><Play aria-hidden="true" />带入工作台并导出</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
};
