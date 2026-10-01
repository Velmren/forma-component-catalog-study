import { useState } from "react";
import { orderLimit } from "../catalog.ts";
import { catalogue, dimensionsOf } from "../data/products.ts";
import { formatNumber, formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import { availableViews } from "../media.ts";
import { href } from "../router.ts";
import type { Cart, Locale, Product } from "../types.ts";
import { AvailabilityLine } from "./AvailabilityLine.tsx";
import { Drawing } from "./Drawing.tsx";
import { ProductImage } from "./ProductImage.tsx";
import { QuantityStepper } from "./QuantityStepper.tsx";
import { Swatch } from "./Swatch.tsx";

interface Props {
  readonly product: Product;
  readonly locale: Locale;
  readonly text: Copy;
  readonly cart: Cart;
  readonly compared: boolean;
  readonly compareFull: boolean;
  readonly onAdd: (product: Product, quantity?: number) => void;
  readonly onDecrease: (id: string) => void;
  readonly onToggleCompare: (id: string) => void;
}

const gallerySizes = "(min-width: 1000px) 58vw, 100vw";

export function ProductPage({ product, locale, text, cart, compared, compareFull, onAdd, onDecrease, onToggleCompare }: Props) {
  const name = product.name[locale];
  const views = availableViews(product.id);
  const dimensions = dimensionsOf(product.id);
  const limit = orderLimit(product);
  const inCart = cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
  const [slide, setSlide] = useState(0);
  const slides = views.length + (dimensions ? 1 : 0);
  const related = catalogue.filter((item) => item.id !== product.id && item.families.some((family) => product.families.includes(family))).slice(0, 4);

  return (
    <article className="product">
      <nav className="breadcrumbs" aria-label="breadcrumbs">
        <a href={href.catalogue()}>{text.back}</a>
        <span aria-hidden="true">/</span>
        <a href={href.catalogue(`c=${product.category}`)}>{text.categoryName(product.category)}</a>
      </nav>

      <div className="product-layout">
        <section
          className="gallery"
          aria-label={text.gallery}
          onScroll={(event) => {
            const strip = event.currentTarget;
            if (strip.scrollWidth > strip.clientWidth) setSlide(Math.round(strip.scrollLeft / strip.clientWidth));
          }}
        >
          {views.map((view, index) => (
            <figure key={view} className={`gallery-item gallery-${view}`}>
              <ProductImage
                id={product.id}
                view={view}
                alt={text.imageOf(name, text.viewNames[view])}
                sizes={gallerySizes}
                missingText={text.imageMissing}
                eager={index === 0}
                transitionName={index === 0 ? `object-${product.id}` : undefined}
              />
            </figure>
          ))}
          {dimensions && (
            <div className="gallery-item gallery-drawing">
              <Drawing id={product.id} dimensions={dimensions} locale={locale} text={text} />
            </div>
          )}
        </section>
        {slides > 1 && (
          <p className="gallery-counter" aria-hidden="true">
            {slide + 1} / {slides}
          </p>
        )}

        <aside className="summary">
          <p className="summary-type">{product.type[locale]}</p>
          <h1 className="summary-name">{name}</h1>
          <p className="summary-material">
            <Swatch value={product.swatch} />
            {product.materialLine[locale]}
          </p>
          <p className="summary-price">{formatPrice(product.priceCents, locale)}</p>
          <AvailabilityLine availability={product.availability} locale={locale} detailed />

          <div className="purchase">
            {inCart > 0 ? (
              <>
                <QuantityStepper name={name} quantity={inCart} limit={limit} text={text} onDecrease={() => onDecrease(product.id)} onIncrease={() => onAdd(product)} />
                <p className="purchase-note">{text.inSelection(inCart)}</p>
              </>
            ) : (
              <button type="button" className="primary-button purchase-add" disabled={limit === 0} onClick={() => onAdd(product)}>
                {limit === 0 ? text.unavailable : text.add}
              </button>
            )}
            <label className={`compare-toggle${compareFull && !compared ? " is-disabled" : ""}`}>
              <input type="checkbox" checked={compared} disabled={compareFull && !compared} onChange={() => onToggleCompare(product.id)} />
              <span>{text.compare}</span>
            </label>
          </div>

          <p className="summary-description">{product.description[locale]}</p>

          <h2 className="specs-title">{text.specs}</h2>
          <dl className="specs">
            {dimensions && (
              <div>
                <dt>{text.dimensions}</dt>
                <dd>
                  <span className="spec-value">
                    {formatNumber(dimensions[0], locale)} × {formatNumber(dimensions[2], locale)} × {formatNumber(dimensions[1], locale)} {text.cm}
                  </span>
                  <span className="spec-hint">{text.widthDepthHeight}</span>
                </dd>
              </div>
            )}
            <div>
              <dt>{text.weight}</dt>
              <dd>
                <span className="spec-value">
                  {formatNumber(product.weightKg, locale)} {text.kg}
                </span>
              </dd>
            </div>
            <div>
              <dt>{text.materials}</dt>
              <dd>
                <ul className="parts">
                  {product.parts.map((part) => (
                    <li key={part.part.en}>
                      <span>{part.part[locale]}</span>
                      <span>{part.material[locale]}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>{text.care}</dt>
              <dd>{product.care[locale]}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <h2 id="related-title">{text.related}</h2>
          <ul>
            {related.map((item) => (
              <li key={item.id}>
                <a href={href.product(item.id)}>
                  <ProductImage
                    id={item.id}
                    view="hero"
                    alt={`${item.type[locale]} ${item.name[locale]}`}
                    sizes="(min-width: 1000px) 20vw, 45vw"
                    missingText={text.imageMissing}
                    transitionName={`object-${item.id}`}
                  />
                  <span className="related-name">{item.name[locale]}</span>
                  <span className="related-meta">
                    {item.type[locale]} · {formatPrice(item.priceCents, locale)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="purchase-bar">
        <span className="purchase-bar-price">{formatPrice(product.priceCents, locale)}</span>
        {inCart > 0 ? (
          <QuantityStepper name={name} quantity={inCart} limit={limit} text={text} onDecrease={() => onDecrease(product.id)} onIncrease={() => onAdd(product)} />
        ) : (
          <button type="button" className="primary-button" disabled={limit === 0} onClick={() => onAdd(product)}>
            {limit === 0 ? text.unavailable : text.add}
          </button>
        )}
      </div>
    </article>
  );
}

export function NotFound({ text }: { readonly text: Copy }) {
  return (
    <section className="empty-state not-found">
      <h1>{text.notFoundTitle}</h1>
      <p>{text.notFoundText}</p>
      <a className="primary-button" href={href.catalogue()}>
        {text.toCatalogue}
      </a>
    </section>
  );
}
