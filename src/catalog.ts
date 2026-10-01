import type {
  AvailabilityFilter,
  Cart,
  CartAction,
  Category,
  Filters,
  MaterialFamily,
  Product,
  SortOrder,
} from "./types.ts";

export const categories: readonly Category[] = ["seating", "tables", "lighting", "storage", "tableware", "textiles"];
export const families: readonly MaterialFamily[] = ["wood", "stone", "ceramic", "metal", "glass", "textile", "leather"];
const sortOrders: readonly SortOrder[] = ["curated", "price-asc", "price-desc", "size-asc"];
const availabilityFilters: readonly AvailabilityFilter[] = ["all", "in-stock", "made-to-order"];

export const defaultFilters: Filters = {
  query: "",
  category: "all",
  families: [],
  price: null,
  availability: "all",
  sort: "curated",
};

export function priceBounds(products: readonly Product[]): readonly [number, number] {
  const prices = products.map((product) => product.priceCents);
  return [Math.min(...prices), Math.max(...prices)];
}

// How many units can go into the selection: stock on hand, or the workshop's batch limit.
export function orderLimit(product: Product): number {
  const { availability } = product;
  if (availability.kind === "in-stock") return availability.stock;
  if (availability.kind === "made-to-order") return availability.limit;
  return 0;
}

function matchesQuery(product: Product, query: string): boolean {
  if (!query) return true;
  // Both languages are searched so switching language never invalidates the current query.
  const text = [product.name, product.type, product.materialLine]
    .flatMap((value) => Object.values(value))
    .join(" ")
    .toLocaleLowerCase();
  return query
    .split(/\s+/)
    .every((word) => text.includes(word));
}

export function filterProducts(products: readonly Product[], filters: Filters, volume?: (product: Product) => number): readonly Product[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const matches = products.filter((product) => {
    if (filters.category !== "all" && product.category !== filters.category) return false;
    if (filters.families.length && !filters.families.some((family) => product.families.includes(family))) return false;
    if (filters.price && (product.priceCents < filters.price[0] || product.priceCents > filters.price[1])) return false;
    if (filters.availability !== "all" && product.availability.kind !== filters.availability) return false;
    return matchesQuery(product, query);
  });
  return sortProducts(matches, filters.sort, volume);
}

export function sortProducts(products: readonly Product[], order: SortOrder, volume?: (product: Product) => number): readonly Product[] {
  const sorted = [...products];
  if (order === "price-asc") sorted.sort((a, b) => a.priceCents - b.priceCents);
  if (order === "price-desc") sorted.sort((a, b) => b.priceCents - a.priceCents);
  if (order === "size-asc" && volume) sorted.sort((a, b) => volume(a) - volume(b));
  return sorted;
}

export function countBy<T extends string>(products: readonly Product[], key: (product: Product) => readonly T[]): ReadonlyMap<T, number> {
  const counts = new Map<T, number>();
  for (const product of products) for (const value of key(product)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function activeFilterCount(filters: Filters): number {
  return (
    (filters.category !== "all" ? 1 : 0) +
    filters.families.length +
    (filters.price ? 1 : 0) +
    (filters.availability !== "all" ? 1 : 0) +
    (filters.query.trim() ? 1 : 0)
  );
}

// Filters live in the hash query so a filtered view can be shared or restored with Back.
export function filtersToQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.category !== "all") params.set("c", filters.category);
  if (filters.families.length) params.set("m", filters.families.join(","));
  if (filters.price) params.set("p", `${filters.price[0] / 100}-${filters.price[1] / 100}`);
  if (filters.availability !== "all") params.set("a", filters.availability);
  if (filters.sort !== "curated") params.set("s", filters.sort);
  return params.toString();
}

export function filtersFromQuery(query: string): Filters {
  const params = new URLSearchParams(query);
  const category = params.get("c");
  const price = params.get("p")?.match(/^(\d+)-(\d+)$/);
  const low = price ? Number(price[1]) * 100 : 0;
  const high = price ? Number(price[2]) * 100 : 0;
  return {
    query: params.get("q") ?? "",
    category: categories.find((value) => value === category) ?? "all",
    families: (params.get("m") ?? "")
      .split(",")
      .filter((value): value is MaterialFamily => families.includes(value as MaterialFamily)),
    price: price && low <= high ? [low, high] : null,
    availability: availabilityFilters.find((value) => value === params.get("a")) ?? "all",
    sort: sortOrders.find((value) => value === params.get("s")) ?? "curated",
  };
}

export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "add": {
      const limit = orderLimit(action.product);
      const line = cart.find(({ product }) => product.id === action.product.id);
      const quantity = Math.min((line?.quantity ?? 0) + (action.quantity ?? 1), limit);
      if (quantity <= (line?.quantity ?? 0)) return cart;
      return line
        ? cart.map((item) => (item.product.id === action.product.id ? { ...item, quantity } : item))
        : [...cart, { product: action.product, quantity }];
    }
    case "decrease":
      return cart.flatMap((line) => {
        if (line.product.id !== action.productId) return [line];
        return line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [];
      });
    case "clear":
      return [];
    case "remove":
      return cart.filter((line) => line.product.id !== action.productId);
  }
}

// Stored data carries IDs and quantities only. Current fixtures supply price and limits.
export function restoreCart(value: unknown, catalogue: readonly Product[]): Cart {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const product = catalogue.find((item) => item.id === line.id);
    if (!product || seen.has(product.id) || !Number.isInteger(line.quantity) || line.quantity < 1) return [];
    const limit = orderLimit(product);
    if (limit === 0) return [];
    seen.add(product.id);
    return [{ product, quantity: Math.min(line.quantity, limit) }];
  });
}

export function restoreIds(value: unknown, catalogue: readonly Product[], max: number): readonly string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === "string" && catalogue.some((product) => product.id === id));
  return [...new Set(ids)].slice(0, max);
}

// Prices remain integer cents until display; no rounding accumulates per item.
export function cartTotalCents(cart: Cart): number {
  return cart.reduce((total, { product, quantity }) => total + product.priceCents * quantity, 0);
}

// The slowest line decides when the whole selection could arrive together.
export function slowestLine(cart: Cart): { readonly weeks: number; readonly product: Product } | { readonly days: number; readonly product: Product } | null {
  let slowest: { weeks: number; product: Product } | { days: number; product: Product } | null = null;
  for (const { product } of cart) {
    const { availability } = product;
    if (availability.kind === "made-to-order") {
      if (!slowest || !("weeks" in slowest) || availability.leadWeeks[1] > slowest.weeks) slowest = { weeks: availability.leadWeeks[1], product };
    } else if (availability.kind === "in-stock" && (!slowest || ("days" in slowest && availability.dispatchDays[1] > slowest.days))) {
      slowest = { days: availability.dispatchDays[1], product };
    }
  }
  return slowest;
}
