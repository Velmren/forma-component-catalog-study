import type { Copy } from "../i18n.ts";

interface Props {
  readonly name: string;
  readonly quantity: number;
  readonly limit: number;
  readonly text: Copy;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
}

export function QuantityStepper({ name, quantity, limit, text, onDecrease, onIncrease }: Props) {
  return (
    <div className="stepper" role="group" aria-label={`${text.quantity}: ${name}`}>
      <button type="button" onClick={onDecrease} aria-label={quantity === 1 ? text.removeNamed(name) : text.decreaseNamed(name)}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" /></svg>
      </button>
      <output aria-live="polite">{quantity}</output>
      <button type="button" onClick={onIncrease} disabled={quantity >= limit} aria-label={text.increaseNamed(name)} title={quantity >= limit ? text.atLimit : undefined}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" /></svg>
      </button>
    </div>
  );
}
