import { useId } from "react";
import { formatNumber } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import { outline } from "../media.ts";
import type { Dimensions, Locale } from "../types.ts";

interface Props {
  readonly id: string;
  readonly dimensions: Dimensions;
  readonly locale: Locale;
  readonly text: Copy;
}

// Front elevation from the model outline, with width and height dimension lines in centimetres.
export function Drawing({ id, dimensions, locale, text }: Props) {
  const maskId = useId();
  const [width, height, depth] = dimensions;
  const unit = Math.max(width, height);
  const gap = unit * 0.07;
  const tick = unit * 0.018;
  const font = unit * 0.042;
  const pad = unit * 0.12;
  const label = (value: number) => `${formatNumber(value, locale)} ${text.cm}`;
  return (
    <figure className="drawing">
      <svg
        viewBox={`${-pad} ${-pad} ${width + pad * 2 + gap + font * 4.2} ${height + pad + gap + font * 2.4}`}
        role="img"
        aria-label={`${text.drawing}: ${label(width)} × ${label(depth)} × ${label(height)}`}
      >
        <defs>
          <mask id={maskId} style={{ maskType: "alpha" }}>
            <image href={outline(id)} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
          </mask>
        </defs>
        <line className="drawing-floor" x1={-pad * 0.6} x2={width + pad * 0.6} y1={height} y2={height} />
        <rect className="drawing-body" x={0} y={0} width={width} height={height} mask={`url(#${maskId})`} />
        <g className="drawing-dimension">
          <line x1={0} x2={width} y1={height + gap} y2={height + gap} />
          <line x1={0} x2={0} y1={height + gap - tick} y2={height + gap + tick} />
          <line x1={width} x2={width} y1={height + gap - tick} y2={height + gap + tick} />
          <text x={width / 2} y={height + gap + font * 1.35} fontSize={font} textAnchor="middle">
            {label(width)}
          </text>
        </g>
        <g className="drawing-dimension">
          <line x1={width + gap} x2={width + gap} y1={0} y2={height} />
          <line x1={width + gap - tick} x2={width + gap + tick} y1={0} y2={0} />
          <line x1={width + gap - tick} x2={width + gap + tick} y1={height} y2={height} />
          <text x={width + gap + font * 0.6} y={height / 2} fontSize={font} dominantBaseline="middle">
            {label(height)}
          </text>
        </g>
      </svg>
    </figure>
  );
}
