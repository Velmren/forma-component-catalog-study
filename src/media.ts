import manifest from "./data/media.json";
import type { Product, ProductView, Swatch } from "./types.ts";

const widths = [480, 960, 1440] as const;
const views: readonly ProductView[] = ["hero", "angle", "detail"];

// Only views that were actually rendered and encoded are listed in media.json.
export function availableViews(id: Product["id"]): readonly ProductView[] {
  const listed: readonly string[] = (manifest as Record<string, readonly string[]>)[id] ?? [];
  return views.filter((view) => listed.includes(view));
}

export function imageSet(id: Product["id"], view: ProductView) {
  const base = `media/${id}/${view}`;
  return {
    src: `${base}-${widths[1]}.webp`,
    thumbnail: `${base}-${widths[0]}.webp`,
    srcSet: widths.map((width) => `${base}-${width}.webp ${width}w`).join(", "),
  };
}

export const outline = (id: Product["id"]) => `media/outlines/${id}.webp`;
export const swatch = (value: Swatch) => ("texture" in value ? `media/swatches/${value.texture}.webp` : `media/${value.render}/swatch.webp`);
export const surface = (texture: string) => `media/notes/${texture}.webp`;
