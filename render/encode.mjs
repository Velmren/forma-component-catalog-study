// Encodes rendered PNG masters into responsive WebP files for the catalogue,
// plus outlines and material swatches. Requires ffmpeg (set FFMPEG to its path if not on PATH).
// Usage: node render/encode.mjs [renderDir=master]
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const source = join(root, "out", process.argv[2] ?? "master");
const media = join(root, "..", "public", "media");
const widths = [480, 960, 1440];

function encode(input, output, filter, quality = 82) {
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", input, "-vf", filter, "-c:v", "libwebp", "-quality", String(quality), "-map_metadata", "-1", output]);
}

for (const file of (await readdir(source)).filter((name) => name.endsWith(".png"))) {
  const [, id, view] = file.match(/^(.+)-(hero|angle|detail|lit)\.png$/) ?? [];
  if (!id) continue;
  await mkdir(join(media, id), { recursive: true });
  for (const width of widths) {
    // Never upscale: a 1200 px master fills the widest slot at its own size.
    encode(join(source, file), join(media, id, `${view}-${width}.webp`), `scale='min(${width},iw)':-2:flags=lanczos`);
  }
  console.log(`${id} ${view}`);
}

// The catalogue shows only views that were actually rendered.
const manifest = {};
for (const id of await readdir(media)) {
  if (["outlines", "swatches", "notes"].includes(id)) continue;
  manifest[id] = ["hero", "angle", "detail"].filter((view) => existsSync(join(media, id, `${view}-${widths[0]}.webp`)));
}
await writeFile(join(root, "..", "src", "data", "media.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const outlines = join(root, "out", "outlines");
await mkdir(join(media, "outlines"), { recursive: true });
for (const file of (await readdir(outlines)).filter((name) => name.endsWith(".png"))) {
  encode(join(outlines, file), join(media, "outlines", file.replace(".png", ".webp")), "format=rgba", 90);
}
await copyFile(join(outlines, "dimensions.json"), join(root, "..", "src", "data", "dimensions.json"));

// Swatches for finishes that are shader values: a small square cut from the product's own
// detail render. Offsets are the crop centre as fractions of the image.
const renderSwatches = {
  "cupola-lamp": [0.5, 0.45],
  "still-carafe": [0.5, 0.85],
  "tier-shelf": [0.3, 0.3],
  "stem-lamp": [0.5, 0.5],
  "orb-pendant": [0.5, 0.42],
  "fold-throw": [0.5, 0.35],
};
for (const [id, [x, y]] of Object.entries(renderSwatches)) {
  const detail = join(source, `${id}-detail.png`);
  if (!existsSync(detail)) continue;
  const crop = `crop=iw*0.14:iw*0.14:iw*${x}-iw*0.07:ih*${y}-iw*0.07,scale=160:160:flags=lanczos`;
  encode(detail, join(media, id, "swatch.webp"), crop, 80);
}

// Larger surface crops for the material notes in the grid (see src/data/materials.ts).
await mkdir(join(media, "notes"), { recursive: true });
for (const id of ["Travertine004", "oak_veneer_01"]) {
  encode(join(root, ".cache", id, "color.jpg"), join(media, "notes", `${id}.webp`), "crop=iw/2:ih/2,scale=900:900:flags=lanczos", 78);
}

// Swatches are centre crops of the same CC0 colour maps used in the renders.
await mkdir(join(media, "swatches"), { recursive: true });
for (const id of await readdir(join(root, ".cache"))) {
  const color = join(root, ".cache", id, "color.jpg");
  if (existsSync(color)) encode(color, join(media, "swatches", `${id}.webp`), "crop=iw/4:ih/4,scale=160:160:flags=lanczos", 80);
}
