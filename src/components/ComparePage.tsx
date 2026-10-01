import { useState } from "react";
import type { CSSProperties } from "react";
import { orderLimit } from "../catalog.ts";
import { dimensionsOf } from "../data/products.ts";
import { availabilityText, formatNumber, formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import { outline } from "../media.ts";
import { href } from "../router.ts";
import type { Locale, Product } from "../types.ts";
import { ProductImage } from "./ProductImage.tsx";

interface Props {
  readonly products: readonly Product[];
  readonly locale: Locale;
  readonly text: Copy;
  readonly onRemove: (id: string) => void;
  readonly onAdd: (product: Product) => void;
}

const stageHeight = 260;

export function ComparePage({ products, locale, text, onRemove, onAdd }: Props) {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  if (products.length < 2) {
    return (
      <section className="empty-state compare-empty">
        <h1>{text.compareEmpty}</h1>
        <p>{text.compareEmptyText}</p>
        <a className="primary-button" href={href.catalogue()}>
          {text.toCatalogue}
        </a>
      </section>
    );
  }
  const sizes = products.map((product) => dimensionsOf(product.id));
  const tallest = Math.max(...sizes.map((size) => size?.[1] ?? 0), 1);
  const scale = stageHeight / tallest;
  const format = (value: number) => formatNumber(value, locale);
  const rows: { key: string; label: string; values: string[] }[] = [
    { key: "price", label: text.price, values: products.map((product) => formatPrice(product.priceCents, locale)) },
    {
      key: "availability",
      label: text.availability,
      values: products.map((product) => {
        const { label, detail } = availabilityText(product.availability, locale);
        return `${label}. ${detail}`;
      }),
    },
    {
      key: "dimensions",
      label: `${text.dimensions}, ${text.widthDepthHeight}`,
      values: sizes.map((size) => (size ? `${format(size[0])} × ${format(size[2])} × ${format(size[1])} ${text.cm}` : "")),
    },
    { key: "weight", label: text.weight, values: products.map((product) => `${format(product.weightKg)} ${text.kg}`) },
    { key: "materials", label: text.materials, values: products.map((product) => product.materialLine[locale]) },
    { key: "care", label: text.care, values: products.map((product) => product.care[locale]) },
  ];
  const visibleRows = differencesOnly ? rows.filter((row) => new Set(row.values).size > 1) : rows;

  return (
    <section className="compare" aria-labelledby="compare-title" style={{ "--columns": products.length } as CSSProperties}>
      <header className="compare-header">
        <h1 id="compare-title">{text.compareTitle}</h1>
        <label className="switch">
          <input type="checkbox" role="switch" checked={differencesOnly} onChange={() => setDifferencesOnly(!differencesOnly)} />
          <span>{text.onlyDifferences}</span>
        </label>
      </header>

      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <td />
              {products.map((product) => (
                <th key={product.id} scope="col">
                  <a href={href.product(product.id)} className="compare-object">
                    <ProductImage id={product.id} view="hero" alt="" sizes="(min-width: 1000px) 20vw, 40vw" missingText={text.imageMissing} />
                    <span className="compare-name">{product.name[locale]}</span>
                    <span className="compare-type">{product.type[locale]}</span>
                  </a>
                  <div className="compare-actions">
                    <button type="button" className="secondary-button" disabled={orderLimit(product) === 0} onClick={() => onAdd(product)}>
                      {orderLimit(product) === 0 ? text.unavailable : text.add}
                    </button>
                    <button type="button" className="text-button" onClick={() => onRemove(product.id)} aria-label={`${text.remove}: ${product.name[locale]}`}>
                      {text.remove}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="scale-row">
              <th scope="row">
                {text.toScale}
                <span className="scale-note">{text.scaleNote}</span>
              </th>
              <td colSpan={products.length}>
                <div className="scale-stage" style={{ height: stageHeight + 36, backgroundSize: `100% ${10 * scale}px` }}>
                  {products.map((product, index) => {
                    const size = sizes[index];
                    if (!size) return <span key={product.id} />;
                    return (
                      <figure key={product.id} className="scale-object">
                        <span
                          className="scale-silhouette"
                          style={{ width: size[0] * scale, height: size[1] * scale, maskImage: `url(${outline(product.id)})`, WebkitMaskImage: `url(${outline(product.id)})` }}
                          role="img"
                          aria-label={`${product.name[locale]}: ${format(size[1])} ${text.cm}`}
                        />
                        <figcaption>{format(size[1])} {text.cm}</figcaption>
                      </figure>
                    );
                  })}
                </div>
              </td>
            </tr>
            {visibleRows.map((row) => (
              <tr key={row.key} className={new Set(row.values).size > 1 ? "is-different" : undefined}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={products[index]?.id ?? index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
