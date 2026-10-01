import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  readonly label: string;
  // Text shown in the trigger; defaults to the label.
  readonly value?: ReactNode;
  // Accessible name when the visible value alone would lose the label.
  readonly valueText?: string;
  readonly badge?: string | undefined;
  readonly active?: boolean;
  readonly popup: "listbox" | "dialog";
  readonly className?: string | undefined;
  readonly closeLabel: string;
  readonly children: (close: () => void) => ReactNode;
}

const phoneQuery = "(max-width: 760px)";
const edgeGap = 8;

function usePhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(phoneQuery).matches);
  useEffect(() => {
    const query = window.matchMedia(phoneQuery);
    const update = () => setPhone(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}

// Trigger plus panel shared by every dropdown: a floating panel that flips at screen edges
// on larger screens, a bottom sheet on phones. Closes on Escape, outside press or Tab away.
export function Dropdown({ label, value, valueText, badge, active = false, popup, className = "", closeLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ up: false, right: false });
  const phone = usePhone();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || phone || !trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const box = panel.current.getBoundingClientRect();
    const below = window.innerHeight - anchor.bottom;
    setPlacement({
      up: below < box.height + edgeGap && anchor.top > below,
      right: anchor.left + box.width > document.documentElement.clientWidth - edgeGap,
    });
  }, [open, phone]);

  useEffect(() => {
    if (!open) return;
    const focusTarget = panel.current?.querySelector<HTMLElement>('[role="listbox"], input, button');
    focusTarget?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !panel.current?.contains(target)) close(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onPanelBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (!phone && next && !panel.current?.contains(next) && !root.current?.contains(next)) setOpen(false);
  };

  const panelContent = (
    <div
      ref={panel}
      id={id}
      className={`dropdown-panel${phone ? " is-sheet" : ""}${placement.up ? " is-up" : ""}${placement.right ? " is-right" : ""}`}
      role={popup === "dialog" ? "dialog" : undefined}
      aria-label={popup === "dialog" ? label : undefined}
      onBlur={onPanelBlur}
    >
      {phone && (
        <header className="dropdown-sheet-header">
          <span>{label}</span>
          <button type="button" className="icon-button" onClick={() => close()} aria-label={closeLabel}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
          </button>
        </header>
      )}
      {children(() => close())}
    </div>
  );

  return (
    <div className={`dropdown ${className}`} ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`filter-button dropdown-trigger${active ? " is-active" : ""}`}
        aria-label={valueText ? `${label}: ${valueText}` : undefined}
        aria-haspopup={popup}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="dropdown-value">{value ?? label}</span>
        {badge && <span className="filter-badge">{badge}</span>}
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {phone
        ? createPortal(
            <AnimatePresence>
              {open && (
                <motion.div className="dropdown-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="dropdown-backdrop" onPointerDown={() => close(false)} />
                  <motion.div
                    className="dropdown-sheet-body"
                    initial={{ y: 48 }}
                    animate={{ y: 0 }}
                    exit={{ y: 48 }}
                    transition={{ duration: 0.26, ease: [0.2, 0, 0, 1] }}
                  >
                    {panelContent}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : (
            <AnimatePresence>
              {open && (
                <motion.div
                  className={`dropdown-float${placement.up ? " is-up" : ""}${placement.right ? " is-right" : ""}`}
                  initial={{ opacity: 0, y: placement.up ? 4 : -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: placement.up ? 4 : -4, scale: 0.98, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                >
                  {panelContent}
                </motion.div>
              )}
            </AnimatePresence>
          )}
    </div>
  );
}
