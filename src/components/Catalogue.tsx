import { AnimatePresence } from "motion/react";
import { useMemo, useRef } from "react";
import { activeFilterCount, categories, countBy, defaultFilters, families, filterProducts, priceBounds } from "../catalog.ts";
import { familySwatch, materialNotes } from "../data/materials.ts";
import { catalogue, dimensionsOf } from "../data/products.ts";
import { formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import type { AvailabilityFilter, Cart, Filters, Locale, MaterialFamily, Product, SortOrder } from "../types.ts";
import { EditorialTile } from "./EditorialTile.tsx";
import { AvailabilityOptions, MaterialOptions } from "./FilterOptions.tsx";
import { Dropdown } from "./Dropdown.tsx";
import { ListBox } from "./ListBox.tsx";
import { PriceRange } from "./PriceRange.tsx";
import { ProductTile } from "./ProductTile.tsx";
import { Swatch } from "./Swatch.tsx";

interface Props {
  readonly filters: Filters;
  readonly locale: Locale;
  readonly text: Copy;
  readonly cart: Cart;
  readonly compareIds: readonly string[];
  readonly compareLimit: number;
  readonly onFilters: (filters: Filters) => void;
  readonly onAdd: (product: Product) => void;
  readonly onDecrease: (id: string) => void;
  readonly onToggleCompare: (id: string) => void;
  readonly travellerId: string | null;
  readonly onOpen: (id: string) => void;
}

const bounds = priceBounds(catalogue);
const volume = (product: Product) => {
  const size = dimensionsOf(product.id);
  return size ? size[0] * size[1] * size[2] : 0;
};

// Notes sit after the first and second rows of the unfiltered grid.
const notePositions = [4, 8];
const sortOrders: readonly SortOrder[] = ["curated", "price-asc", "price-desc", "size-asc"];

export function Catalogue({ filters, locale, text, cart, compareIds, compareLimit, onFilters, onAdd, onDecrease, onToggleCompare, travellerId, onOpen }: Props) {
  const sheet = useRef<HTMLDialogElement>(null);
  const visible = useMemo(() => filterProducts(catalogue, filters, volume), [filters]);
  const without = (patch: Partial<Filters>) => filterProducts(catalogue, { ...filters, ...patch });
  const familyCounts = countBy(without({ families: [] }), (product) => product.families);
  const categoryCounts = countBy(without({ category: "all" }), (product) => [product.category]);
  const availabilityCounts = useMemo(() => {
    const base = filterProducts(catalogue, { ...filters, availability: "all" });
    const counts = countBy<AvailabilityFilter>(base, (product) => (product.availability.kind === "sold-out" ? [] : [product.availability.kind]));
    return new Map(counts).set("all", base.length);
  }, [filters]);
  const allCounts = countBy(catalogue, (product) => product.families);
  const active = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const toggleFamily = (family: MaterialFamily) =>
    set({ families: filters.families.includes(family) ? filters.families.filter((value) => value !== family) : [...filters.families, family] });
  const showNotes = active === 0 && filters.sort === "curated";
  const quantity = (id: string) => cart.find((line) => line.product.id === id)?.quantity ?? 0;

  const chips: { key: string; label: string; clear: Partial<Filters> }[] = [
    ...(filters.query.trim() ? [{ key: "q", label: `«${filters.query.trim()}»`, clear: { query: "" } }] : []),
    ...filters.families.map((family) => ({
      key: family,
      label: text.familyName(family),
      clear: { families: filters.families.filter((value) => value !== family) },
    })),
    ...(filters.price ? [{ key: "p", label: `${formatPrice(filters.price[0], locale)} – ${formatPrice(filters.price[1], locale)}`, clear: { price: null } }] : []),
    ...(filters.availability !== "all" ? [{ key: "a", label: text.availabilityName(filters.availability), clear: { availability: "all" as const } }] : []),
  ];

  const items = visible.flatMap((product, index) => {
    const tile = (
      <ProductTile
        key={product.id}
        product={product}
        locale={locale}
        text={text}
        quantity={quantity(product.id)}
        compared={compareIds.includes(product.id)}
        compareFull={compareIds.length >= compareLimit}
        eager={index < 4}
        onAdd={onAdd}
        onDecrease={onDecrease}
        onToggleCompare={onToggleCompare}
        travels={travellerId === product.id}
        onOpen={onOpen}
      />
    );
    const noteIndex = notePositions.indexOf(index + 1);
    const note = showNotes && noteIndex >= 0 ? materialNotes[noteIndex] : undefined;
    return note
      ? [
          tile,
          <EditorialTile
            key={`note-${note.family}`}
            note={note}
            locale={locale}
            actionLabel={`${text.familyName(note.family)}: ${text.objects(allCounts.get(note.family) ?? 0)}`}
            onSelect={() => set({ families: [note.family] })}
          />,
        ]
      : [tile];
  });

  const materialPanel = <MaterialOptions selected={filters.families} counts={familyCounts} text={text} onChange={(value) => set({ families: value })} />;
  const pricePanel = <PriceRange bounds={bounds} value={filters.price ?? bounds} locale={locale} text={text} onChange={(value) => set({ price: value })} />;
  const availabilityPanel = <AvailabilityOptions value={filters.availability} counts={availabilityCounts} text={text} onChange={(value) => set({ availability: value })} />;
  const search = (
    <label className="search">
      <span className="sr-only">{text.search}</span>
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
      <input type="search" value={filters.query} placeholder={text.searchPlaceholder} onChange={(event) => set({ query: event.currentTarget.value })} />
    </label>
  );
  // Every option label sits in the trigger's grid cell, so its width never changes with the choice.
  const sortValue = (
    <span className="dropdown-sizer">
      {sortOrders.map((order) => (
        <span key={order} className={order === filters.sort ? "is-current" : undefined}>
          {text.sortName(order)}
        </span>
      ))}
    </span>
  );
  const sort = (
    <div className="sort">
      <span aria-hidden="true">{text.sort}</span>
      <Dropdown label={text.sort} value={sortValue} valueText={text.sortName(filters.sort)} popup="listbox" closeLabel={text.close} className="sort-dropdown">
        {(close) => (
          <ListBox
            label={text.sort}
            options={sortOrders.map((order) => ({ value: order, label: text.sortName(order) }))}
            selected={[filters.sort]}
            onChange={([order]) => order && set({ sort: order as SortOrder })}
            onCommit={close}
          />
        )}
      </Dropdown>
    </div>
  );

  return (
    <>
      <section className="intro" aria-labelledby="catalogue-title">
        <h1 id="catalogue-title">{text.intro(catalogue.length, families.length)}</h1>
        <div className="intro-aside">
          <p>{text.introText}</p>
          <ul className="material-index" aria-label={text.materialIndex}>
            {families.map((family) => (
              <li key={family}>
                <button type="button" aria-pressed={filters.families.includes(family)} onClick={() => toggleFamily(family)}>
                  <Swatch value={familySwatch[family]} />
                  <span>{text.familyName(family)}</span>
                  <span className="index-count">{allCounts.get(family) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="toolbar" id="catalogue">
        <div className="toolbar-top">
        <nav className="category-tabs" aria-label={text.filters}>
          {(["all", ...categories] as const).map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={filters.category === category}
              disabled={category !== "all" && !categoryCounts.get(category)}
              onClick={() => set({ category })}
            >
              {text.categoryName(category)}
              <span className="tab-count">{category === "all" ? without({ category: "all" }).length : categoryCounts.get(category) ?? 0}</span>
            </button>
          ))}
        </nav>
          <p className="result-count" role="status">
            {text.objects(visible.length)}
          </p>
        </div>
        <div className="toolbar-row">
          <div className="toolbar-filters">
            <Dropdown
              label={text.material}
              badge={filters.families.length ? String(filters.families.length) : undefined}
              active={filters.families.length > 0}
              popup="listbox"
              closeLabel={text.close}
            >
              {() => (
                <ListBox
                  label={text.material}
                  multiple
                  options={families.map((family) => {
                    const count = familyCounts.get(family) ?? 0;
                    return {
                      value: family,
                      label: text.familyName(family),
                      leading: <Swatch value={familySwatch[family]} />,
                      trailing: <span className="option-count">{count}</span>,
                      disabled: count === 0 && !filters.families.includes(family),
                    };
                  })}
                  selected={filters.families}
                  onChange={(value) => set({ families: value as MaterialFamily[] })}
                />
              )}
            </Dropdown>
            <Dropdown label={text.price} active={filters.price !== null} popup="dialog" closeLabel={text.close}>
              {() => <div className="dropdown-price">{pricePanel}</div>}
            </Dropdown>
            {availabilityPanel}
          </div>
          <button type="button" className="filter-button sheet-trigger" onClick={() => sheet.current?.showModal()}>
            {text.filters}
            {active > 0 && <span className="filter-badge">{active}</span>}
          </button>
          <div className="toolbar-end">
            {search}
            {sort}
          </div>
        </div>
        {chips.length > 0 && (
          <div className="chips">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="chip" onClick={() => set(chip.clear)} aria-label={text.removeFilter(chip.label)}>
                {chip.label}
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>
              </button>
            ))}
            <button type="button" className="text-button" onClick={() => onFilters({ ...defaultFilters, sort: filters.sort })}>
              {text.reset}
            </button>
          </div>
        )}
      </div>

      {visible.length > 0 ? (
        <ul className="grid">
          <AnimatePresence mode="popLayout" initial={false}>
            {items}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="empty-state">
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyText}</p>
          <div className="empty-actions">
            <button type="button" className="primary-button" onClick={() => onFilters(defaultFilters)}>
              {text.reset}
            </button>
            {families
              .filter((family) => allCounts.get(family))
              .slice(0, 4)
              .map((family) => (
                <button key={family} type="button" className="chip" onClick={() => onFilters({ ...defaultFilters, families: [family] })}>
                  <Swatch value={familySwatch[family]} />
                  {text.familyName(family)}
                </button>
              ))}
          </div>
        </div>
      )}

      <dialog ref={sheet} className="sheet" aria-labelledby="filter-sheet-title" onClick={(event) => event.target === sheet.current && sheet.current.close()}>
        <div className="sheet-body">
          <header className="sheet-header">
            <h2 id="filter-sheet-title">{text.filters}</h2>
            <button type="button" className="icon-button" onClick={() => sheet.current?.close()} aria-label={text.close}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
            </button>
          </header>
          {search}
          {materialPanel}
          <section className="sheet-section">
            <h3>{text.price}</h3>
            {pricePanel}
          </section>
          <section className="sheet-section">
            <h3>{text.availability}</h3>
            {availabilityPanel}
          </section>
          <footer className="sheet-footer">
            <button type="button" className="secondary-button" onClick={() => onFilters({ ...defaultFilters, sort: filters.sort })}>
              {text.reset}
            </button>
            <button type="button" className="primary-button" onClick={() => sheet.current?.close()}>
              {text.showResults(visible.length)}
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
