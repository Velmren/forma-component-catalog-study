// Saves front outlines and measured dimensions of every product to render/out/outlines.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const ids = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const pixelsPerMeter = 600;
const outDir = join(root, "out", "outlines");

const server = await createServer({ configFile: join(root, "vite.config.ts"), logLevel: "error" });
await server.listen();
// --software keeps the GPU free: SwiftShader instead of the graphics card.
const software = process.argv.includes("--software");
const browser = await chromium.launch({
  args: software
    ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu"]
    : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await mkdir(outDir, { recursive: true });
const dimensions = {};
try {
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => typeof window.silhouette === "function");
  for (const id of ids) {
    const { png, size } = await page.evaluate(([product, ppm]) => window.silhouette(product, ppm), [id, pixelsPerMeter]);
    await writeFile(join(outDir, `${id}.png`), Buffer.from(png.split(",")[1], "base64"));
    dimensions[id] = size.map((metres) => Math.round(metres * 1000) / 10);
    console.log(id, dimensions[id].join(" x "), "cm");
  }
  await writeFile(join(outDir, "dimensions.json"), JSON.stringify(dimensions, null, 2));
} finally {
  await browser.close();
  await server.close();
}
