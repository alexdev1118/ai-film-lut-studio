import { X } from "lucide-react";
import type { MediaItem } from "../../types";

interface MediaThumbnailProps {
  readonly item: MediaItem;
  readonly isActive: boolean;
  readonly onSelect: (itemId: string) => void;
  readonly onDelete: (itemId: string) => void;
}

export const MediaThumbnail = ({ item, isActive, onSelect, onDelete }: MediaThumbnailProps) => {
  const handleDelete = () => {
    onDelete(item.id);
  };

  return (
    <article className={isActive ? "media-thumbnail active" : "media-thumbnail"}>
      <button className="media-thumbnail-select" type="button" onClick={() => onSelect(item.id)}>
        <span className="media-thumb-image-wrap">
          <img className="media-thumb-image" src={item.url} alt={item.name} />
        </span>
        <span className="media-thumb-name" title={item.name}>
          {item.name}
        </span>
      </button>
      <button aria-label={`删除 ${item.name}`} className="media-thumb-delete" type="button" onClick={handleDelete}>
        <X aria-hidden="true" />
      </button>
    </article>
  );
};
