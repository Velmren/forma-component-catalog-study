# FORMA media

## Product images

Every product image is the project's own path-traced render of a parametric model written in `render/src/products.ts`. The only third-party image material is the CC0 texture and HDRI set listed below.

- **Models.** Turned objects (tables, lamps, glassware, bowl) are lathe profiles with small fillets on every edge. Furniture is assembled from extrusions, tubes and filled cushion forms. The throw is one continuous sheet folded into four layers, with a hand-placed fringe. The same models give the images, the outlines and the dimensions in `src/data/dimensions.json`.
- **Scene.** A seamless paper sweep, one large soft box, a white bounce card and a studio HDRI for reflections. Khronos PBR Neutral tone mapping keeps material colours close to their values.
- **Renderer.** three.js 0.186 with three-gpu-pathtracer 0.0.26 in Chromium (`render/capture.mjs`). Front views are rendered at 1440×1800 with 500 samples, three-quarter and detail views at 1200×1500 with 400 samples. The frame is split into tiles of about 60,000 pixels so each draw call stays in the tens of milliseconds; a single full-frame draw at this size can exceed the Windows GPU timeout.
- **Encoding.** `render/encode.mjs` converts the PNG masters to WebP at 480, 960 and up to 1440 px (never upscaled) and strips metadata.

## Scanned materials

All surface textures and the lighting environment are CC0 1.0 (public domain). They are downloaded by `render/fetch-assets.mjs` and not stored in the repository; the catalogue ships only crops of the colour maps as swatches (`public/media/swatches`) and material surfaces (`public/media/notes`).

| Asset | Used for | Author | Source |
|---|---|---|---|
| Travertine004 | Plinth table, stone swatch and note | ambientCG | https://ambientcg.com/view?id=Travertine004 |
| Ash Veneer | Tri stool | Jenelle van Heerden | https://polyhaven.com/a/ash_veneer |
| Oak Veneer 01 | Harbour chair, Slab table, wood swatch and note | Jenelle van Heerden | https://polyhaven.com/a/oak_veneer_01 |
| Walnut Veneer | Arc chair, Hollow bowl | Jenelle van Heerden | https://polyhaven.com/a/walnut_veneer |
| Brown Leather | Arc chair seat, leather swatch | Rob Tuytel | https://polyhaven.com/a/brown_leather |
| Poly Wool Herringbone | Harbour chair cushions (relief only), textile swatch | colormass, Rico Cilliers | https://polyhaven.com/a/poly_wool_herringbone |
| Rough Linen | Stem lamp shade (relief only) | colormass, Rico Cilliers | https://polyhaven.com/a/rough_linen |
| Fabric068 | Fold throw, chunky knit | ambientCG | https://ambientcg.com/view?id=Fabric068 |
| Studio Small 09 (HDRI) | Reflections and fill light | Sergej Majboroda | https://polyhaven.com/a/studio_small_09 |

Glazes, powder coat, glass, steel and brass are shader parameters, not scans; their swatches are small crops of the product's own detail render.

## Outlines and drawings

`render/outline.mjs` renders each model as a flat front elevation at 600 px per metre and records its bounding box in centimetres. The product page draws dimension lines over the outline; the comparison scales outlines by the same factor. The throw is measured folded, as shown; its unfolded size is listed with its materials.

## Type

Onest (variable), SIL Open Font License 1.1, bundled through `@fontsource-variable/onest`.

## Interface captures

Screenshots and recordings of the interface are real browser captures of this application.
