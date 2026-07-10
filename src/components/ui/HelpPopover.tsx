import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";
import type { LutHelpContent } from "../../data/lutHelpContent";

interface HelpPopoverPosition {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface HelpPopoverProps {
  readonly content: LutHelpContent;
}

const getPopoverPosition = (trigger: HTMLButtonElement): HelpPopoverPosition => {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const gap = 10;
  const maxWidth = Math.min(340, viewportWidth - gap * 2);
  const width = Math.max(220, Math.min(maxWidth, 300));
  const left = Math.max(gap, Math.min(rect.left, viewportWidth - width - gap));
  const estimatedHeight = 220;
  const opensUpward = viewportHeight - rect.bottom < estimatedHeight && rect.top > viewportHeight - rect.bottom;
  const top = opensUpward ? Math.max(gap, rect.top - estimatedHeight - gap) : Math.min(viewportHeight - gap - 88, rect.bottom + gap);

  return { left, top, width };
};

export const HelpPopover = ({ content }: HelpPopoverProps) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<HelpPopoverPosition | null>(null);

  const refreshPosition = () => {
    if (triggerRef.current !== null) {
      setPosition(getPopoverPosition(triggerRef.current));
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    refreshPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const popover = document.getElementById(popoverId);
      if (triggerRef.current?.contains(target) || popover?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", refreshPosition);
    window.addEventListener("scroll", refreshPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", refreshPosition);
      window.removeEventListener("scroll", refreshPosition, true);
    };
  }, [isOpen, popoverId]);

  const popover =
    isOpen && position !== null
      ? createPortal(
          <section
            aria-labelledby={`${popoverId}-title`}
            className="help-popover"
            id={popoverId}
            role="dialog"
            style={{ left: position.left, top: position.top, width: position.width }}
          >
            <strong id={`${popoverId}-title`}>{content.title}</strong>
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>,
          document.body
        )
      : null;

  return (
    <>
      <button
        aria-controls={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        aria-label={`查看${content.title}说明`}
        className="help-popover-trigger"
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            refreshPosition();
          }
          setIsOpen((current) => !current);
        }}
      >
        <CircleHelp aria-hidden="true" />
      </button>
      {popover}
    </>
  );
};
