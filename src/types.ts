export type Locale = "en" | "ru";
export type LocalizedText = Readonly<Record<Locale, string>>;

export type Category = "seating" | "tables" | "lighting" | "storage" | "tableware" | "textiles";
export type MaterialFamily = "wood" | "stone" | "ceramic" | "metal" | "glass" | "textile" | "leather";
export type ProductView = "hero" | "angle" | "detail";

export type Availability =
  | { readonly kind: "in-stock"; readonly stock: number; readonly dispatchDays: readonly [number, number] }
  | { readonly kind: "made-to-order"; readonly limit: number; readonly leadWeeks: readonly [number, number] }
  | { readonly kind: "sold-out"; readonly restock: LocalizedText };

export type AvailabilityKind = Availability["kind"];

// A crop of a scanned texture, or a crop of the product's own detail render for finishes
// that are shader values (glaze, powder coat, glass, brass).
export type Swatch = { readonly texture: string } | { readonly render: string };

export interface MaterialPart {
  readonly part: LocalizedText;
  readonly material: LocalizedText;
}

export interface Product {
  readonly id: string;
  readonly number: number;
  readonly name: LocalizedText;
  readonly type: LocalizedText;
  readonly category: Category;
  readonly families: readonly MaterialFamily[];
  readonly materialLine: LocalizedText;
  readonly description: LocalizedText;
  readonly priceCents: number;
  readonly availability: Availability;
  readonly weightKg: number;
  readonly parts: readonly MaterialPart[];
  readonly care: LocalizedText;
  readonly swatch: Swatch;
}

// Width, height and depth in centimetres, measured from the same models that produce the images.
export type Dimensions = readonly [width: number, height: number, depth: number];

export type AvailabilityFilter = "all" | "in-stock" | "made-to-order";
export type SortOrder = "curated" | "price-asc" | "price-desc" | "size-asc";

export interface Filters {
  readonly query: string;
  readonly category: Category | "all";
  readonly families: readonly MaterialFamily[];
  readonly price: readonly [number, number] | null;
  readonly availability: AvailabilityFilter;
  readonly sort: SortOrder;
}

export interface CartLine {
  readonly product: Product;
  readonly quantity: number;
}

export type Cart = readonly CartLine[];
export type CartAction =
  | { readonly type: "add"; readonly product: Product; readonly quantity?: number }
  | { readonly type: "decrease"; readonly productId: Product["id"] }
  | { readonly type: "remove"; readonly productId: Product["id"] }
  | { readonly type: "clear" };
