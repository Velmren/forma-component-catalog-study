import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface ListOption {
  readonly value: string;
  readonly label: string;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly disabled?: boolean;
}

interface Props {
  readonly label: string;
  readonly options: readonly ListOption[];
  readonly selected: readonly string[];
  readonly multiple?: boolean;
  readonly onChange: (selected: readonly string[]) => void;
  // Single choice closes the list; multiple choice stays open until Escape or Tab.
  readonly onCommit?: () => void;
}

const typeaheadDelay = 600;

// ARIA listbox with the keyboard model of a native select: arrows, Home and End,
// Enter or Space to choose, and typing the first letters of an option to jump to it.
export function ListBox({ label, options, selected, multiple = false, onChange, onCommit }: Props) {
  const id = useId();
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const enabled = options.flatMap((option, index) => (option.disabled ? [] : [index]));
  const firstSelected = options.findIndex((option) => selected.includes(option.value) && !option.disabled);
  const [active, setActive] = useState(firstSelected >= 0 ? firstSelected : (enabled[0] ?? 0));

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    setActive(index);
    typed.current = { text: "", at: 0 };
    if (!multiple) {
      onChange([option.value]);
      onCommit?.();
      return;
    }
    onChange(selected.includes(option.value) ? selected.filter((value) => value !== option.value) : [...selected, option.value]);
  };

  const move = (from: number, step: number) => {
    if (!enabled.length) return from;
    const position = enabled.indexOf(from);
    const next = position < 0 ? 0 : Math.min(Math.max(position + step, 0), enabled.length - 1);
    return enabled[next] ?? from;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive(move(active, 1)),
      ArrowUp: () => setActive(move(active, -1)),
      Home: () => setActive(enabled[0] ?? active),
      End: () => setActive(enabled.at(-1) ?? active),
      Enter: () => choose(active),
      " ": () => choose(active),
    };
    const handler = keys[event.key];
    if (handler) {
      event.preventDefault();
      handler();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = performance.now();
      const text = (now - typed.current.at < typeaheadDelay ? typed.current.text : "") + event.key.toLocaleLowerCase();
      typed.current = { text, at: now };
      // Search from the next option so repeating one letter cycles through its matches.
      const start = text.length === 1 ? active + 1 : active;
      for (let offset = 0; offset < options.length; offset++) {
        const index = (start + offset) % options.length;
        const option = options[index];
        if (option && !option.disabled && option.label.toLocaleLowerCase().startsWith(text)) {
          setActive(index);
          break;
        }
      }
    }
  };

  return (
    <ul
      ref={list}
      className={`listbox${multiple ? " is-multiple" : ""}`}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-multiselectable={multiple || undefined}
      aria-activedescendant={`${id}-${active}`}
      onKeyDown={onKeyDown}
    >
      {options.map((option, index) => {
        const isSelected = selected.includes(option.value);
        return (
          <li
            key={option.value}
            id={`${id}-${index}`}
            data-index={index}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            className={`listbox-option${index === active ? " is-active" : ""}`}
            onPointerMove={() => !option.disabled && setActive(index)}
            onClick={() => choose(index)}
          >
            <span className={`listbox-check${multiple ? " is-box" : ""}`} aria-hidden="true">
              {isSelected && <svg viewBox="0 0 16 16"><path d="m3.5 8.5 3 3 6-7" /></svg>}
            </span>
            {option.leading}
            <span className="listbox-label">{option.label}</span>
            {option.trailing}
          </li>
        );
      })}
    </ul>
  );
}
