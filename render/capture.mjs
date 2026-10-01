// Renders product views with the path tracer in Chromium and saves PNG masters to render/out.
// Usage: node render/capture.mjs plinth-table:hero cupola-lamp:angle ... [--samples=600] [--size=1600x2000]
//   [--raster] [--software] [--probe: time each tile draw] [--missing: skip views already in the output folder]
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const jobs = args.filter((arg) => !arg.startsWith("--"));
const samples = Number(option("samples", 600));
const [width, height] = option("size", "1600x2000").split("x").map(Number);
const exposure = Number(option("exposure", 1));
const raster = args.includes("--raster");
const probe = args.includes("--probe");
const skipExisting = args.includes("--missing");
const outDir = join(root, "out", option("dir", ""));

const server = await createServer({ configFile: join(root, "vite.config.ts"), logLevel: "error" });
await server.listen();
// --software keeps the GPU free: SwiftShader instead of the graphics card.
const software = process.argv.includes("--software");
const browser = await chromium.launch({
  args: software
    ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu"]
    : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
page.on("pageerror", (error) => console.error(error));
await mkdir(outDir, { recursive: true });

try {
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => typeof window.renderJob === "function");
  const gpu = await page.evaluate(() => window.gpu);
  console.log(gpu);
  // Without --software a CPU fallback would take hours per image; stop instead.
  if (!software && /swiftshader/i.test(gpu)) throw new Error("GPU unavailable: Chromium fell back to SwiftShader");
  for (const job of jobs) {
    const [product, view = "hero"] = job.split(":");
    if (skipExisting && existsSync(join(outDir, `${product}-${view}.png`))) continue;
    const result = await page.evaluate(
      (spec) => window.renderJob(spec),
      { product, view, width, height, samples, exposure, raster, probe },
    );
    const file = join(outDir, `${product}-${view}.png`);
    await writeFile(file, Buffer.from(result.png.split(",")[1], "base64"));
    console.log(`${job}: ${result.ms} ms, ${result.tiles}x${result.tiles} tiles${probe ? `, slowest draw ${result.slowestDrawMs} ms` : ""} -> ${file}`);
  }
} finally {
  await browser.close();
  await server.close();
}
