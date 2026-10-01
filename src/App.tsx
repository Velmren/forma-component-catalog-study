import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { cartReducer, cartTotalCents, filtersFromQuery, filtersToQuery, restoreCart, restoreIds } from "./catalog.ts";
import { Catalogue } from "./components/Catalogue.tsx";
import { ComparePage } from "./components/ComparePage.tsx";
import { CompareTray } from "./components/CompareTray.tsx";
import { Header } from "./components/Header.tsx";
import { NotFound, ProductPage } from "./components/ProductPage.tsx";
import { SelectionDrawer } from "./components/SelectionDrawer.tsx";
import { catalogue } from "./data/products.ts";
import { copy, formatPrice } from "./i18n.ts";
import { useRoute } from "./router.ts";
import { readJson, writeJson } from "./storage.ts";
import type { Filters, Locale, Product } from "./types.ts";

const keys = { cart: "forma-selection-v2", compare: "forma-compare-v2", locale: "forma-locale" };
const compareLimit = 4;

// A stored choice wins; otherwise any Russian browser language opens the Russian catalogue.
function initialLocale(): Locale {
  const stored = readJson(keys.locale);
  if (stored === "ru" || stored === "en") return stored;
  return navigator.languages.some((language) => language.toLowerCase().startsWith("ru")) ? "ru" : "en";
}

export default function App() {
  const { route, replaceQuery } = useRoute();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [cart, dispatch] = useReducer(cartReducer, undefined, () => restoreCart(readJson(keys.cart), catalogue));
  const [compareIds, setCompareIds] = useState(() => restoreIds(readJson(keys.compare), catalogue, compareLimit));
  const [saved, setSaved] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  // The object whose image travels between the grid and its page in either direction.
  const [travellerId, setTravellerId] = useState<string | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const text = copy[locale];
  const filters = useMemo(() => filtersFromQuery(route.name === "catalogue" ? route.query : ""), [route]);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cartTotalCents(cart);
  const compared = compareIds.flatMap((id) => catalogue.find((product) => product.id === id) ?? []);
  const product = route.name === "product" ? catalogue.find((item) => item.id === route.id) : undefined;

  useEffect(() => {
    if (route.name === "product") setTravellerId(route.id);
  }, [route]);

  useEffect(() => {
    document.documentElement.lang = locale;
    writeJson(keys.locale, locale);
  }, [locale]);

  useEffect(() => {
    setSaved(writeJson(keys.cart, cart.map(({ product: item, quantity }) => ({ id: item.id, quantity }))));
  }, [cart]);

  useEffect(() => {
    writeJson(keys.compare, compareIds);
  }, [compareIds]);

  useEffect(() => {
    document.title = product
      ? `${product.name[locale]}, ${product.type[locale].toLocaleLowerCase()} · FORMA`
      : route.name === "compare"
        ? `${text.compareTitle} · FORMA`
        : "FORMA";
  }, [product, route, locale, text]);

  // Stable handlers let memoised tiles skip re-rendering when another tile changes.
  const add = useCallback(
    (item: Product) => {
      dispatch({ type: "add", product: item });
      setAnnouncement(text.added(item.name[locale]));
    },
    [text, locale],
  );
  const decrease = useCallback((productId: string) => dispatch({ type: "decrease", productId }), []);
  const toggleCompare = useCallback(
    (id: string) =>
      setCompareIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : ids.length < compareLimit ? [...ids, id] : ids)),
    [],
  );
  const setFilters = (next: Filters) => replaceQuery(filtersToQuery(next));

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <a className="skip-link" href="#main">
          {text.skip}
        </a>
        <Header
          route={route}
          locale={locale}
          text={text}
          itemCount={itemCount}
          totalCents={total}
          compareCount={compareIds.length}
          onLocale={setLocale}
          onOpenSelection={() => drawer.current?.showModal()}
        />
        <main id="main" tabIndex={-1}>
          {route.name === "catalogue" && (
            <Catalogue
              filters={filters}
              locale={locale}
              text={text}
              cart={cart}
              compareIds={compareIds}
              compareLimit={compareLimit}
              onFilters={setFilters}
              onAdd={add}
              onDecrease={decrease}
              onToggleCompare={toggleCompare}
              travellerId={travellerId}
              onOpen={setTravellerId}
            />
          )}
          {route.name === "product" &&
            (product ? (
              <ProductPage
                key={product.id}
                product={product}
                locale={locale}
                text={text}
                cart={cart}
                compared={compareIds.includes(product.id)}
                compareFull={compareIds.length >= compareLimit}
                onAdd={add}
                onDecrease={decrease}
                onToggleCompare={toggleCompare}
              />
            ) : (
              <NotFound text={text} />
            ))}
          {route.name === "compare" && <ComparePage products={compared} locale={locale} text={text} onRemove={toggleCompare} onAdd={add} />}
        </main>
        <footer className="site-footer">
          <p>{text.footerNote}</p>
          <a className="site-link" href="https://velmren.com/">
            VELMREN
          </a>
        </footer>
        {route.name !== "compare" && (
          <CompareTray products={compared} locale={locale} text={text} onRemove={toggleCompare} onClear={() => setCompareIds([])} />
        )}
        <SelectionDrawer
          ref={drawer}
          cart={cart}
          locale={locale}
          text={text}
          saved={saved}
          onAdd={add}
          onDecrease={decrease}
          onRemove={(productId) => dispatch({ type: "remove", productId })}
          onClear={() => dispatch({ type: "clear" })}
        />
        <p className="sr-only" role="status" aria-live="polite">
          {announcement} {text.status(itemCount, formatPrice(total, locale))}
        </p>
      </div>
    </MotionConfig>
  );
}
