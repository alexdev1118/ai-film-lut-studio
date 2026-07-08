import type { CSSProperties, RefObject } from "react";
import { ChevronsLeftRight } from "lucide-react";

interface BeforeAfterPreviewProps {
  readonly beforeImageUrl: string;
  readonly afterImageUrl?: string;
  readonly beforeAlt: string;
  readonly afterAlt: string;
  readonly splitPosition: number;
  readonly isWaitingForPreview: boolean;
  readonly effectFilter?: string;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly onSplitStart: () => void;
}

const getFrameStyle = (imageWidth?: number, imageHeight?: number): CSSProperties => {
  if (typeof imageWidth === "number" && typeof imageHeight === "number" && imageWidth > 0 && imageHeight > 0) {
    const ratio = imageWidth / imageHeight;

    if (ratio > 1.2) {
      return {
        aspectRatio: `${imageWidth} / ${imageHeight}`,
        width: "min(100%, 1120px)"
      };
    }

    return {
      aspectRatio: `${imageWidth} / ${imageHeight}`,
      height: "min(100%, 62vh)"
    };
  }

  return {
    aspectRatio: "16 / 9",
    width: "min(100%, 1120px)"
  };
};

export const BeforeAfterPreview = ({
  beforeImageUrl,
  afterImageUrl,
  beforeAlt,
  afterAlt,
  splitPosition,
  isWaitingForPreview,
  effectFilter = "none",
  imageWidth,
  imageHeight,
  containerRef,
  onSplitStart
}: BeforeAfterPreviewProps) => {
  const hasAfterImage = afterImageUrl !== undefined;

  return (
    <div className="split-preview-stage">
      <div className="preview-stage-surface">
        <div ref={containerRef} className={hasAfterImage ? "split-preview-frame has-after" : "split-preview-frame"} style={getFrameStyle(imageWidth, imageHeight)}>
          <div className="split-image before">
            <img src={beforeImageUrl} alt={beforeAlt} />
          </div>

          {hasAfterImage ? (
            <div
              className="split-image after"
              style={{
                clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
                filter: effectFilter
              }}
            >
              <img src={afterImageUrl} alt={afterAlt} />
            </div>
          ) : null}

          {hasAfterImage ? (
            <button
              aria-label="拖动对比线"
              className="split-handle"
              style={{ left: `${splitPosition}%` }}
              type="button"
              onMouseDown={onSplitStart}
              onTouchStart={onSplitStart}
            >
              <ChevronsLeftRight aria-hidden="true" />
            </button>
          ) : null}

          <span className="preview-label before-label">原图</span>
          {hasAfterImage ? <span className="preview-label after-label">效果图</span> : null}
        </div>

        {hasAfterImage ? null : (
          <div className="preview-waiting-state">
            <strong>{isWaitingForPreview ? "等待生成预览" : "效果图待生成"}</strong>
            <span>当前仅显示原图，点击生成仿色预览后再启用对比线</span>
          </div>
        )}
      </div>
    </div>
  );
};
