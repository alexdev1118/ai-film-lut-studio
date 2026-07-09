import { X } from "lucide-react";

interface PreviewLightboxProps {
  readonly isOpen: boolean;
  readonly beforeImageUrl: string;
  readonly afterImageUrl?: string;
  readonly beforeAlt: string;
  readonly afterAlt: string;
  readonly styleName: string;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  readonly onClose: () => void;
}

const getPreviewMode = (imageWidth?: number, imageHeight?: number): "portrait" | "landscape" | "square" | "ultrawide" => {
  if (typeof imageWidth !== "number" || typeof imageHeight !== "number" || imageWidth <= 0 || imageHeight <= 0) {
    return "landscape";
  }

  const widthToHeight = imageWidth / imageHeight;
  const heightToWidth = imageHeight / imageWidth;

  if (widthToHeight >= 2) {
    return "ultrawide";
  }

  if (heightToWidth >= 1.2) {
    return "portrait";
  }

  if (widthToHeight >= 1.2) {
    return "landscape";
  }

  return "square";
};

export const PreviewLightbox = ({
  isOpen,
  beforeImageUrl,
  afterImageUrl,
  beforeAlt,
  afterAlt,
  styleName,
  imageWidth,
  imageHeight,
  onClose
}: PreviewLightboxProps) => {
  if (!isOpen) {
    return null;
  }

  const mode = getPreviewMode(imageWidth, imageHeight);

  return (
    <div className="preview-lightbox-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className={`preview-lightbox ${mode}-mode`.trim()} aria-label="大图预览" role="dialog" aria-modal="true">
        <header className="preview-lightbox-header">
          <div>
            <span>大图预览</span>
            <h2>{styleName}</h2>
          </div>
          <button aria-label="关闭大图预览" className="preview-lightbox-close" type="button" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={afterImageUrl === undefined ? "preview-lightbox-grid single" : "preview-lightbox-grid"}>
          <figure>
            <img src={beforeImageUrl} alt={beforeAlt} />
            <figcaption>原图</figcaption>
          </figure>
          {afterImageUrl === undefined ? null : (
            <figure>
              <img src={afterImageUrl} alt={afterAlt} />
              <figcaption>效果图</figcaption>
            </figure>
          )}
        </div>
      </section>
    </div>
  );
};
