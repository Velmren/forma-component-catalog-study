import { swatch } from "../media.ts";
import type { Swatch as SwatchValue } from "../types.ts";

interface Props {
  readonly value: SwatchValue;
  readonly size?: "small" | "large";
}

export function Swatch({ value, size = "small" }: Props) {
  const style = { backgroundImage: `url(${swatch(value)})` };
  return <span className={`swatch swatch-${size}`} style={style} aria-hidden="true" />;
}
