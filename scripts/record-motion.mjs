// Records the main motion paths to video and measures frame pacing while they run.
// Uses the GPU, as a visitor's browser would. Usage:
//   node scripts/record-motion.mjs <baseUrl> <outDir> [desktop|phone] [--measure]
// --measure skips video capture, which itself costs frames, for a clean frame-rate reading.
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const [base, outDir, mode = "desktop"] = args;
const record = !process.argv.includes("--measure");
if (!base || !outDir) throw new Error("Usage: record-motion.mjs <baseUrl> <outDir> [desktop|phone]");
await mkdir(outDir, { recursive: true });
const phone = mode === "phone";
const viewport = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: phone ? 2 : 1,
  isMobile: phone,
  hasTouch: phone,
  locale: "ru-RU",
  ...(record ? { recordVideo: { dir: outDir, size: viewport } } : {}),
});
const page = await context.newPage();

// Frame intervals are collected in the page; each phase reports its own pacing.
await page.addInitScript(() => {
  window.frameLog = [];
  const tick = (time) => {
    window.frameLog.push(time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const phases = [];
async function phase(name, action, settle = 900) {
  const start = await page.evaluate(() => window.frameLog.length);
  await action();
  await page.waitForTimeout(settle);
  const frames = await page.evaluate((from) => window.frameLog.slice(from), start);
  const gaps = frames.slice(1).map((time, index) => time - frames[index]);
  const sorted = [...gaps].sort((a, b) => a - b);
  const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  phases.push({
    name,
    fps: Math.round(1000 / average),
    p95: Number(sorted[Math.floor(sorted.length * 0.95)]?.toFixed(1)),
    worst: Number(sorted.at(-1)?.toFixed(1)),
    long: gaps.filter((gap) => gap > 25).length,
    frames: gaps.length,
  });
}

await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

if (phone) {
  await phase("open filter sheet", () => page.getByRole("button", { name: "Фильтры" }).click());
  await phase("filter by metal", async () => {
    await page.locator("dialog.sheet").getByText("Металл").click();
    await page.locator("dialog.sheet").getByRole("button", { name: /Показать/ }).click();
  });
  await phase("scroll grid", () => page.mouse.wheel(0, 900), 1200);
  await phase("add to selection", () => page.locator(".grid .tile .add-button").first().click());
  await phase("open product", () => page.locator(".grid .tile-link").first().click(), 1200);
  await phase("swipe gallery", () => page.locator(".gallery").evaluate((strip) => strip.scrollBy({ left: strip.clientWidth, behavior: "smooth" })), 1200);
  await phase("back to catalogue", () => page.goBack(), 1200);
} else {
  await phase("hover tile", () => page.locator(".grid .tile-media").nth(1).hover());
  await phase("filter by wood", () => page.locator(".material-index button", { hasText: "Дерево" }).click());
  await phase("add filter in stock", () => page.locator(".toolbar .segment", { hasText: "В наличии" }).click());
  await phase("reset filters", () => page.locator(".chips .text-button").click());
  await phase("add to selection", () => page.locator(".grid .tile .add-button").nth(2).click());
  await phase("open selection", () => page.locator(".selection-button").click());
  await phase("close selection", () => page.keyboard.press("Escape"));
  await phase("tick compare", async () => {
    await page.getByRole("checkbox", { name: "Сравнить «Стебель»" }).check();
    await page.getByRole("checkbox", { name: "Сравнить «Цоколь»" }).check();
  });
  await phase("open product", () => page.locator(".grid .tile-link").nth(1).click(), 1200);
  await phase("scroll product", () => page.mouse.wheel(0, 1400), 1400);
  await phase("back to catalogue", () => page.goBack(), 1200);
  await phase("open comparison", () => page.locator(".compare-tray a").click(), 1200);
}

const video = record ? page.video() : null;
await context.close();
await browser.close();
if (video) await rename(await video.path(), join(outDir, `motion-${mode}.webm`));
console.table(phases);
