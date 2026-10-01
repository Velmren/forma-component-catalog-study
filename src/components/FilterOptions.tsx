import { useId } from "react";
import { families } from "../catalog.ts";
import { familySwatch } from "../data/materials.ts";
import type { Copy } from "../i18n.ts";
import type { AvailabilityFilter, MaterialFamily } from "../types.ts";
import { Swatch } from "./Swatch.tsx";

interface MaterialProps {
  readonly selected: readonly MaterialFamily[];
  readonly counts: ReadonlyMap<MaterialFamily, number>;
  readonly text: Copy;
  readonly onChange: (value: readonly MaterialFamily[]) => void;
}

export function MaterialOptions({ selected, counts, text, onChange }: MaterialProps) {
  return (
    <fieldset className="option-list">
      <legend>{text.material}</legend>
      {families.map((family) => {
        const checked = selected.includes(family);
        const count = counts.get(family) ?? 0;
        return (
          <label key={family} className="option">
            <input
              type="checkbox"
              checked={checked}
              disabled={!checked && count === 0}
              onChange={() => onChange(checked ? selected.filter((value) => value !== family) : [...selected, family])}
            />
            <Swatch value={familySwatch[family]} />
            <span className="option-name">{text.familyName(family)}</span>
            <span className="option-count">{count}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

interface AvailabilityProps {
  readonly value: AvailabilityFilter;
  readonly counts: ReadonlyMap<AvailabilityFilter, number>;
  readonly text: Copy;
  readonly onChange: (value: AvailabilityFilter) => void;
}

const availabilityOptions: readonly AvailabilityFilter[] = ["all", "in-stock", "made-to-order"];

export function AvailabilityOptions({ value, counts, text, onChange }: AvailabilityProps) {
  const name = useId();
  return (
    <fieldset className="segmented">
      <legend className="sr-only">{text.availability}</legend>
      {availabilityOptions.map((option) => (
        <label key={option} className="segment">
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
          <span>
            {text.availabilityName(option)}
            <span className="segment-count">{counts.get(option) ?? 0}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
