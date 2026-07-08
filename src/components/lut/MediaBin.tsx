import type { MediaItem } from "../../types";
import { MediaThumbnail } from "./MediaThumbnail";

interface MediaBinProps {
  readonly title: string;
  readonly items: readonly MediaItem[];
  readonly activeItemId?: string;
  readonly emptyLabel: string;
  readonly onSelect: (itemId: string) => void;
  readonly onDelete: (itemId: string) => void;
}

export const MediaBin = ({ title, items, activeItemId, emptyLabel, onSelect, onDelete }: MediaBinProps) => {
  return (
    <section className="media-bin" aria-label={title}>
      <div className="media-bin-header">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="media-bin-empty">{emptyLabel}</p>
      ) : (
        <div className="media-bin-list">
          {items.map((item) => (
            <MediaThumbnail
              key={item.id}
              isActive={item.id === activeItemId}
              item={item}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
};
