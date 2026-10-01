# Project structure

```
.
├── index.html              Page shell, metadata and favicon link
├── package.json            Scripts and pinned dependencies
├── vite.config.ts          Vite build with a relative base for subdirectory hosting
├── tsconfig.json           Strict TypeScript settings for src and tests
├── README.md               Features, commands and verification summary
├── UX.md                   Concept, research findings, visual specification, motion and states
├── MEDIA.md                Render pipeline, CC0 sources, fonts and image provenance
├── LICENSE                 MIT licence
├── docs/
│   └── screenshot.webp     Catalogue screenshot shown in the README
├── public/
│   ├── favicon.svg         FORMA mark
│   ├── assets/             Onest font licence (OFL 1.1), copied into the build
│   └── media/              Encoded renders per product, outlines, swatches and material surfaces
├── src/
│   ├── main.tsx            Entry: fonts, styles and React root
│   ├── App.tsx             State, persistence, routing and page composition
│   ├── catalog.ts          Pure filtering, sorting, address format, selection reducer, restoration
│   ├── router.ts           Hash routes and view transitions between pages
│   ├── storage.ts          Local storage access that tolerates blocked storage
│   ├── media.ts            Image paths, responsive sets and available views
│   ├── i18n.ts             Russian and English copy, plurals, price and availability text
│   ├── types.ts            Domain types
│   ├── data/               Product fixtures, measured dimensions, media manifest, material notes
│   ├── components/         Header, catalogue, tiles, filters, product page, drawing, comparison, selection
│   └── styles/             Tokens, base, catalogue, product page, panel and dropdown styles
├── tests/
│   └── catalog.test.ts     node:test behaviour tests for catalog.ts
├── scripts/
│   ├── check-flows.mjs     Browser scenarios through Playwright
│   ├── capture-ui.mjs      Review screenshots at chosen sizes
│   └── record-motion.mjs   Motion recordings and per-step frame pacing
└── render/                 Offline product render bench (not part of the catalogue build)
    ├── assets.json         CC0 textures and HDRI to download
    ├── fetch-assets.mjs    Downloads assets into render/.cache with source records
    ├── capture.mjs         Path-traces product views into render/out
    ├── outline.mjs         Front outlines and measured dimensions
    ├── encode.mjs          WebP encoding, media manifest, swatches and surfaces
    ├── index.html          Render page used by the scripts
    ├── vite.config.ts      Dev server for the render page
    ├── tsconfig.json       Type checking for the render bench
    └── src/                Studio scene, materials, geometry helpers and product models
```

Built or downloaded locally and kept out of the repository: `node_modules/`, `dist/`, `render/.cache/` (downloaded textures), `render/out/` (PNG masters).
