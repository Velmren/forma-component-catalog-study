import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cartReducer,
  cartTotalCents,
  defaultFilters,
  filterProducts,
  filtersFromQuery,
  filtersToQuery,
  orderLimit,
  restoreCart,
  restoreIds,
  slowestLine,
} from "../src/catalog.ts";
import type { Availability, Cart, Filters, MaterialFamily, Product } from "../src/types.ts";

function product(id: string, patch: { priceCents: number; families: MaterialFamily[]; availability: Availability; category?: Product["category"]; ru: string; en: string }): Product {
  return {
    id,
    number: 1,
    name: { ru: patch.ru, en: patch.en },
    type: { ru: "Предмет", en: "Object" },
    category: patch.category ?? "tables",
    families: patch.families,
    materialLine: { ru: "Материал", en: "Material" },
    description: { ru: "", en: "" },
    priceCents: patch.priceCents,
    availability: patch.availability,
    weightKg: 1,
    parts: [],
    care: { ru: "", en: "" },
    swatch: { texture: "oak_veneer_01" },
  };
}

const table = product("table", { ru: "Плита", en: "Slab", priceCents: 89000, families: ["wood", "metal"], availability: { kind: "made-to-order", limit: 3, leadWeeks: [6, 8] } });
const stool = product("stool", { ru: "Тройка", en: "Tri", category: "seating", priceCents: 24000, families: ["wood"], availability: { kind: "in-stock", stock: 2, dispatchDays: [2, 4] } });
const pendant = product("pendant", { ru: "Шар", en: "Orb", category: "lighting", priceCents: 29000, families: ["glass", "metal"], availability: { kind: "sold-out", restock: { ru: "", en: "" } } });
const catalogue = [table, stool, pendant];
const ids = (products: readonly Product[]) => products.map((item) => item.id);
const filters = (patch: Partial<Filters>): Filters => ({ ...defaultFilters, ...patch });

test("search matches either language and every word", () => {
  assert.deepEqual(ids(filterProducts(catalogue, filters({ query: "  тройка " }))), ["stool"]);
  assert.deepEqual(ids(filterProducts(catalogue, filters({ query: "slab" }))), ["table"]);
  assert.deepEqual(ids(filterProducts(catalogue, filters({ query: "slab tri" }))), []);
});

test("materials combine with OR, other filters with AND", () => {
  assert.deepEqual(ids(filterProducts(catalogue, filters({ families: ["glass", "wood"] }))), ["table", "stool", "pendant"]);
  assert.deepEqual(ids(filterProducts(catalogue, filters({ families: ["metal"], category: "lighting" }))), ["pendant"]);
  assert.deepEqual(ids(filterProducts(catalogue, filters({ price: [20000, 30000] }))), ["stool", "pendant"]);
  assert.deepEqual(ids(filterProducts(catalogue, filters({ availability: "in-stock" }))), ["stool"]);
  assert.deepEqual(ids(filterProducts(catalogue, filters({ availability: "made-to-order", families: ["glass"] }))), []);
});

test("sorting works on the filtered result without mutating it", () => {
  const source = [...catalogue];
  assert.deepEqual(ids(filterProducts(source, filters({ sort: "price-asc" }))), ["stool", "pendant", "table"]);
  assert.deepEqual(ids(filterProducts(source, filters({ sort: "price-desc", families: ["metal"] }))), ["table", "pendant"]);
  assert.deepEqual(ids(source), ["table", "stool", "pendant"]);
});

test("filters survive a round trip through the address and reject unknown values", () => {
  const value = filters({ query: "дуб", category: "tables", families: ["wood", "stone"], price: [10000, 50000], availability: "in-stock", sort: "price-desc" });
  assert.deepEqual(filtersFromQuery(filtersToQuery(value)), value);
  assert.deepEqual(filtersFromQuery("c=boats&m=wood,plastic&p=900-100&a=soon&s=random"), filters({ families: ["wood"] }));
  assert.equal(filtersToQuery(defaultFilters), "");
});

test("selection respects stock, workshop limits and sold-out objects", () => {
  let cart: Cart = [];
  for (let i = 0; i < 5; i++) cart = cartReducer(cart, { type: "add", product: stool });
  assert.equal(cart[0]?.quantity, orderLimit(stool));
  const before = cart;
  assert.equal(cartReducer(cart, { type: "add", product: stool }), before, "unchanged state keeps its identity");
  cart = cartReducer(cart, { type: "add", product: table, quantity: 10 });
  assert.equal(cart[1]?.quantity, 3);
  assert.equal(cartReducer(cart, { type: "add", product: pendant }).length, 2);
  cart = cartReducer(cart, { type: "decrease", productId: "stool" });
  cart = cartReducer(cart, { type: "decrease", productId: "stool" });
  assert.deepEqual(ids(cart.map((line) => line.product)), ["table"]);
  assert.equal(cartReducer(cart, { type: "clear" }).length, 0);
});

test("totals stay in integer cents and the slowest line is reported", () => {
  const cart: Cart = [
    { product: stool, quantity: 2 },
    { product: table, quantity: 1 },
  ];
  assert.equal(cartTotalCents(cart), 137000);
  assert.deepEqual(slowestLine(cart), { weeks: 8, product: table });
  assert.deepEqual(slowestLine([{ product: stool, quantity: 1 }]), { days: 4, product: stool });
  assert.equal(slowestLine([]), null);
});

test("restoring stored data drops malformed, duplicate and unavailable lines", () => {
  const restored = restoreCart(
    [{ id: "stool", quantity: 9 }, { id: "stool", quantity: 1 }, { id: "pendant", quantity: 1 }, { id: "gone", quantity: 1 }, { id: "table", quantity: 1.5 }, null],
    catalogue,
  );
  assert.deepEqual(restored.map((line) => [line.product.id, line.quantity]), [["stool", 2]]);
  assert.deepEqual(restoreCart("broken", catalogue), []);
  assert.deepEqual(restoreIds(["table", "table", 4, "gone", "stool", "pendant"], catalogue, 2), ["table", "stool"]);
});
