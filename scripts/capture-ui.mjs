// Screenshots of catalogue states for review. Runs Chromium with software rendering.
// Usage: node scripts/capture-ui.mjs <baseUrl> <outDir> [name=hash@WIDTHxHEIGHT[:full] ...]
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const [base, outDir, ...shots] = process.argv.slice(2);
if (!base || !outDir) throw new Error("Usage: capture-ui.mjs <baseUrl> <outDir> name=hash@1440x900[:full] ...");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--disable-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const shot of shots) {
    const [, name, hash, width, height, full] = shot.match(/^([\w-]+)=([^@]*)@(\d+)x(\d+)(:full)?$/) ?? [];
    if (!name) throw new Error(`Bad shot spec: ${shot}`);
    const mobile = Number(width) < 700;
    const context = await browser.newContext({
      viewport: { width: Number(width), height: Number(height) },
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
      locale: name.includes("-en") ? "en-GB" : "ru-RU",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error(`${name}: ${error.message}`));
    await page.goto(`${base}${hash}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (full) {
      // Walk down the page so lazy images load before the full-page capture.
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += 600) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: Boolean(full) });
    console.log(name);
    await context.close();
  }
} finally {
  await browser.close();
}
