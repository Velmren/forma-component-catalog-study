import { useId } from "react";
import type { CSSProperties } from "react";
import { formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import type { Locale } from "../types.ts";

interface Props {
  readonly bounds: readonly [number, number];
  readonly value: readonly [number, number];
  readonly locale: Locale;
  readonly text: Copy;
  readonly onChange: (value: readonly [number, number]) => void;
}

const step = 1000;

// Two native range inputs share one track: each keeps its own keyboard behaviour and label.
export function PriceRange({ bounds, value, locale, text, onChange }: Props) {
  const id = useId();
  // The scale runs from zero to a round ceiling so the tick labels fall at even intervals.
  const tickStep = 50000;
  const [min, max] = [0, Math.ceil(bounds[1] / tickStep) * tickStep];
  const [low, high] = [Math.max(value[0], min), Math.min(value[1], max)];
  const position = (cents: number) => ((cents - min) / (max - min)) * 100;
  const ticks = Array.from({ length: max / tickStep + 1 }, (_, index) => index * tickStep);
  return (
    <div className="price-range">
      <p className="price-range-value" aria-live="polite">
        {formatPrice(low, locale)} – {formatPrice(high, locale)}
      </p>
      <div className="price-range-track" style={{ "--low": `${position(low)}%`, "--high": `${position(high)}%` } as CSSProperties}>
        <input
          type="range"
          id={`${id}-low`}
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label={`${text.price}, ${text.priceFrom}`}
          aria-valuetext={formatPrice(low, locale)}
          onChange={(event) => onChange([Math.min(Number(event.currentTarget.value), high - step), high])}
        />
        <input
          type="range"
          id={`${id}-high`}
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label={`${text.price}, ${text.priceTo}`}
          aria-valuetext={formatPrice(high, locale)}
          onChange={(event) => onChange([low, Math.max(Number(event.currentTarget.value), low + step)])}
        />
      </div>
      <div className="price-range-ticks" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ left: `${position(tick)}%` }}>
            {formatPrice(tick, locale)}
          </span>
        ))}
      </div>
    </div>
  );
}
