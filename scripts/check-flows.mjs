// Browser checks of the main catalogue paths. Chromium with software rendering.
// Usage: node scripts/check-flows.mjs <baseUrl> [screenshotDir]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const [base = "http://127.0.0.1:5173/", shots] = process.argv.slice(2);
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ args: ["--disable-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
const errors = [];

async function check(name, run, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport ?? { width: 1440, height: 900 }, locale: options.locale ?? "ru-RU", reducedMotion: "reduce", ...options.context });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => message.type() === "error" && errors.push(`${name}: ${message.text()}`));
  try {
    await run(page, context);
    results.push(`ok   ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  } finally {
    if (shots) await page.screenshot({ path: join(shots, `${name}.png`) }).catch(() => {});
    await context.close();
  }
}

const tiles = (page) => page.locator(".grid .tile");
// Playwright inserts non-Latin text without key events; a Russian layout sends real keydowns.
const typeKeys = (locator, text) => locator.evaluate((element, keys) => {
  for (const key of keys) element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}, [...text]);
const names = (page) => page.locator(".grid .tile-name").allTextContents();

await check("language-from-browser", async (page) => {
  await page.goto(base);
  assert.equal(await page.locator("html").getAttribute("lang"), "ru");
  assert.match(await page.locator("h1").textContent(), /Двенадцать предметов из семи материалов/);
});

await check("language-english-and-persisted", async (page) => {
  await page.goto(base);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("lang"), "ru");
}, { locale: "en-GB" });

await check("material-filter-and-address", async (page) => {
  await page.goto(base);
  await page.locator(".material-index button", { hasText: "Стекло" }).click();
  await page.waitForTimeout(300);
  assert.deepEqual((await names(page)).sort(), ["Тишь", "Шар"]);
  assert.match(page.url(), /m=glass/);
  await page.reload();
  assert.equal(await tiles(page).count(), 2);
});

await check("category-price-availability", async (page) => {
  await page.goto(`${base}#/?c=lighting`);
  assert.equal(await tiles(page).count(), 3);
  await page.locator(".toolbar .segment", { hasText: "В наличии" }).click();
  await page.waitForTimeout(400);
  assert.match(page.url(), /a=in-stock/);
  assert.deepEqual((await names(page)).sort(), ["Купол", "Стебель"]);
  await page.goto(`${base}#/?p=0-100`);
  await page.waitForTimeout(500);
  assert.deepEqual((await names(page)).sort(), ["Тишь"]);
});

await check("search-both-languages-and-empty-state", async (page) => {
  await page.goto(base);
  const search = page.locator(".toolbar .search input");
  await search.fill("oak");
  await page.waitForTimeout(300);
  assert.deepEqual((await names(page)).sort(), ["Гавань", "Плита"]);
  await search.fill("мрамор");
  await page.getByText("Таких предметов нет").waitFor();
  await page.getByRole("button", { name: "Сбросить" }).last().click();
  await page.waitForTimeout(300);
  assert.equal(await tiles(page).count(), 12);
});

await check("price-popover-keyboard", async (page) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Цена" }).click();
  const high = page.getByRole("slider", { name: /Цена, до/ });
  await high.focus();
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape");
  assert.match(page.url(), /p=\d+-\d+/);
  assert.ok((await tiles(page).count()) < 12);
});

await check("sort-listbox-keyboard", async (page) => {
  await page.goto(base);
  const trigger = page.locator(".sort-dropdown .dropdown-trigger");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const list = page.getByRole("listbox", { name: "Порядок" });
  await list.waitFor();
  assert.equal(await list.getByRole("option").count(), 4);
  assert.equal(await list.getByRole("option", { selected: true }).textContent(), "По номеру");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await list.waitFor({ state: "detached" });
  assert.match(page.url(), /s=size-asc/);
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("dropdown-trigger")), true, "focus returns to the trigger");
  await page.keyboard.press("ArrowDown");
  await list.waitFor();
  await page.keyboard.press("Home");
  await typeKeys(list, "с");
  await page.keyboard.press("Enter");
  assert.match(page.url(), /s=price-asc/, "typing the first letter jumps to the first match");
  await trigger.click();
  await list.waitFor();
  await typeKeys(list, "по");
  await page.keyboard.press("Enter");
  assert.doesNotMatch(page.url(), /s=/, "typing several letters narrows the match");
});

await check("material-listbox-multiple", async (page) => {
  await page.goto(base);
  const trigger = page.locator(".toolbar-filters .dropdown-trigger", { hasText: "Материал" });
  await trigger.click();
  const list = page.getByRole("listbox", { name: "Материал" });
  assert.equal(await list.getAttribute("aria-multiselectable"), "true");
  await page.keyboard.press(" ");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press(" ");
  assert.equal(await list.getByRole("option", { selected: true }).count(), 2);
  assert.match(page.url(), /m=wood(%2C|,)metal/);
  await page.mouse.click(700, 150);
  await list.waitFor({ state: "detached" });
  await page.waitForTimeout(400);
  assert.equal(await tiles(page).count(), 9, "wood or metal");
  await trigger.click();
  await page.keyboard.press("Escape");
  await list.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes("Материал")), true);
});

await check("dropdown-edges-and-sizes", async (page) => {
  for (const [width, height, locale] of [[1920, 1080, "ru"], [1440, 900, "en"], [1440, 900, "ru"]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base);
    await page.getByRole("button", { name: locale.toUpperCase(), exact: true }).click();
    const heights = await page.locator(".toolbar .filter-button, .toolbar .segmented, .toolbar .search").evaluateAll((items) =>
      items.filter((item) => item.offsetParent).map((item) => Math.round(item.getBoundingClientRect().height)),
    );
    assert.ok(heights.every((value) => value === 40), `${width} ${locale}: control heights ${heights}`);
    await page.locator(".sort-dropdown .dropdown-trigger").click();
    const box = await page.locator(".dropdown-panel").boundingBox();
    assert.ok(box && box.x + box.width <= width && box.x >= 0, "panel stays inside the window");
    await page.keyboard.press("Escape");
  }
});

await check("phone-sort-sheet", async (page) => {
  await page.goto(base);
  const filters = await page.getByRole("button", { name: "Фильтры" }).boundingBox();
  const sort = await page.locator(".sort-dropdown .dropdown-trigger").boundingBox();
  assert.ok(filters && sort && Math.abs(filters.width - sort.width) <= 1 && filters.height === sort.height, "phone controls match");
  await page.locator(".sort-dropdown .dropdown-trigger").click();
  const sheet = page.locator(".dropdown-sheet-body");
  await sheet.waitFor();
  await page.waitForTimeout(400);
  const box = await sheet.boundingBox();
  assert.ok(box && Math.round(box.y + box.height) === 844, "sheet sits on the bottom edge");
  await sheet.getByRole("option", { name: "Сначала дороже" }).click();
  await sheet.waitFor({ state: "detached" });
  assert.match(page.url(), /s=price-desc/);
}, { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });

await check("selection-limits-total-and-storage", async (page) => {
  await page.goto(base);
  const tile = tiles(page).filter({ hasText: "Ярус" });
  await tile.getByRole("button", { name: /Добавить «Ярус»/ }).click();
  await tile.getByRole("button", { name: /Добавить ещё один/ }).click();
  assert.equal(await tile.getByRole("button", { name: /Добавить ещё один/ }).isDisabled(), true, "stock of 2 caps the quantity");
  await page.reload();
  await page.locator(".selection-button").click();
  const drawer = page.locator("dialog.drawer");
  await drawer.waitFor();
  assert.match(await drawer.locator(".summary-total").textContent(), /1\s040\s€/);
  assert.match(await drawer.textContent(), /Сохраняется на этом устройстве/);
  await page.keyboard.press("Escape");
});

await check("sold-out-cannot-be-added", async (page) => {
  await page.goto(`${base}#/object/orb-pendant`);
  assert.equal(await page.locator(".purchase-add").isDisabled(), true);
  assert.match(await page.locator(".summary .availability").textContent(), /Ожидается в ноябре/);
});

await check("product-page-and-back", async (page) => {
  await page.goto(base);
  await page.locator(".tile-link", { hasText: "Купол" }).click();
  await page.locator(".summary-name", { hasText: "Купол" }).waitFor();
  assert.match(await page.locator(".specs").textContent(), /37 см/);
  assert.equal(await page.locator(".drawing svg").count(), 1);
  await page.goBack();
  await tiles(page).first().waitFor();
});

await check("unknown-product", async (page) => {
  await page.goto(`${base}#/object/nothing-here`);
  await page.getByText("Такого предмета нет в каталоге").waitFor();
});

await check("compare-to-scale", async (page) => {
  await page.goto(base);
  for (const name of ["Цоколь", "Стебель", "Тишь"]) await page.getByRole("checkbox", { name: `Сравнить «${name}»` }).check();
  await page.locator(".compare-tray a").click();
  await page.locator(".compare-table").waitFor();
  const heights = await page.locator(".scale-silhouette").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  assert.ok(heights[1] > heights[0] && heights[0] > heights[2], "silhouettes keep real proportions");
  await page.getByRole("switch").check();
  assert.ok((await page.locator(".compare-table tbody tr").count()) >= 5);
});

await check("storage-blocked", async (page) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  await page.goto(base);
  await tiles(page).first().getByRole("button", { name: /Добавить/ }).click();
  await page.locator(".selection-button").click();
  await page.getByText(/Браузер не даёт сохранять/).waitFor();
});

await check("phone-filter-sheet", async (page) => {
  await page.goto(base);
  await page.getByRole("button", { name: "Фильтры" }).click();
  const sheet = page.locator("dialog.sheet");
  await sheet.getByText("Металл").click();
  await sheet.getByRole("button", { name: /Показать 5 предметов/ }).click();
  await page.waitForTimeout(300);
  assert.equal(await tiles(page).count(), 5);
}, { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });

await check("no-horizontal-overflow", async (page) => {
  for (const hash of ["#/", "#/object/slab-table", "#/object/harbour-chair"]) {
    await page.goto(`${base}${hash}`);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${hash} overflows by ${overflow}px`);
  }
}, { viewport: { width: 320, height: 640 }, context: { isMobile: true, hasTouch: true } });

await browser.close();
console.log(results.join("\n"));
if (errors.length) console.log(`\nConsole errors:\n${errors.join("\n")}`);
process.exitCode = results.some((line) => line.startsWith("FAIL")) || errors.length ? 1 : 0;
