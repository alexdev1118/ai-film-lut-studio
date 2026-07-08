import type { LutStyle } from "../../types";
import { Button } from "../ui/Button";

interface StyleCardProps {
  readonly style: LutStyle;
  readonly onUse: (styleName: string) => void;
}

export const StyleCard = ({ style, onUse }: StyleCardProps) => {
  return (
    <article className="style-card" data-style-id={style.id}>
      <div className="style-preview" style={{ background: style.previewImage }}>
        <span>{style.category}</span>
      </div>
      <div className="style-card-body">
        <h3>{style.name}</h3>
        <p>{style.description}</p>
        <div className="tag-row">
          {style.keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
        <p className="small-copy">适合：{style.suitableFor}</p>
        <p className="small-copy">推荐强度：{style.recommendedIntensity}</p>
        <Button aria-label={`立即使用 ${style.name}`} variant="secondary" onClick={() => onUse(style.name)}>
          立即使用
        </Button>
      </div>
    </article>
  );
};
