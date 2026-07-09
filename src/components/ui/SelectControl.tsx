import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface SelectControlOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

interface FloatingPosition {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly maxHeight: number;
}

interface SelectControlProps {
  readonly value: string;
  readonly options: readonly SelectControlOption[];
  readonly onChange: (value: string) => void;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
}

const getMenuPosition = (button: HTMLButtonElement): FloatingPosition => {
  const rect = button.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const gap = 8;
  const minMenuHeight = 140;
  const maxPreferredHeight = 280;
  const estimatedOptionHeight = 58;
  const estimatedMenuHeight = Math.min(maxPreferredHeight, Math.max(52, button.dataset.optionCount === undefined ? minMenuHeight : Number(button.dataset.optionCount) * estimatedOptionHeight + 12));
  const spaceBelow = viewportHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const opensUpward = spaceBelow < minMenuHeight && spaceAbove > spaceBelow;
  const availableSpace = opensUpward ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(52, Math.min(maxPreferredHeight, availableSpace));
  const renderedHeight = Math.min(estimatedMenuHeight, maxHeight);
  const top = opensUpward ? Math.max(gap, rect.top - renderedHeight - gap) : Math.min(viewportHeight - gap - renderedHeight, rect.bottom + gap);
  const left = Math.min(Math.max(gap, rect.left), viewportWidth - rect.width - gap);

  return {
    left,
    top,
    width: rect.width,
    maxHeight
  };
};

export const SelectControl = ({ value, options, onChange, label, disabled = false, placeholder = "请选择", className = "" }: SelectControlProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<FloatingPosition | null>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const safeActiveIndex = options.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), options.length - 1);

  const refreshPosition = () => {
    if (buttonRef.current !== null) {
      setPosition(getMenuPosition(buttonRef.current));
    }
  };

  const openMenu = () => {
    if (disabled || options.length === 0) {
      return;
    }

    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    refreshPosition();
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const commitOption = (option: SelectControlOption) => {
    onChange(option.value);
    closeMenu();
    buttonRef.current?.focus();
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

      const button = buttonRef.current;
      const menu = document.getElementById(listboxId);
      if (button?.contains(target) || menu?.contains(target)) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
      }
    };

    const handleLayoutChange = () => {
      refreshPosition();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [isOpen, listboxId]);

  const handleButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }

      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (options.length === 0) {
          return current;
        }

        return (current + direction + options.length) % options.length;
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }

      if (safeActiveIndex >= 0) {
        commitOption(options[safeActiveIndex]);
      }
    }
  };

  const menu =
    isOpen && position !== null
      ? createPortal(
          <div
            className="select-control-menu"
            id={listboxId}
            role="listbox"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === safeActiveIndex;
              return (
                <button
                  aria-selected={isSelected}
                  className={`select-control-option ${isSelected ? "selected" : ""} ${isActive ? "active" : ""}`.trim()}
                  key={option.value}
                  role="option"
                  type="button"
                  onClick={() => commitOption(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    {option.description !== undefined ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <Check aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <label className={`select-control custom-select-control ${className}`.trim()}>
      {label !== undefined ? <span>{label}</span> : null}
      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        className="select-control-trigger"
        data-option-count={options.length}
        disabled={disabled}
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
      >
        <span className={selectedOption === null ? "select-placeholder" : ""}>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" className={isOpen ? "open" : ""} />
      </button>
      {menu}
    </label>
  );
};
