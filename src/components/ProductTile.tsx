import { motion } from "motion/react";
import { memo, useState } from "react";
import { orderLimit } from "../catalog.ts";
import { formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import { availableViews } from "../media.ts";
import { href } from "../router.ts";
import type { Locale, Product } from "../types.ts";
import { AvailabilityLine } from "./AvailabilityLine.tsx";
import { ProductImage } from "./ProductImage.tsx";
import { QuantityStepper } from "./QuantityStepper.tsx";

interface Props {
  readonly product: Product;
  readonly locale: Locale;
  readonly text: Copy;
  readonly quantity: number;
  readonly compared: boolean;
  readonly compareFull: boolean;
  readonly eager: boolean;
  readonly onAdd: (product: Product) => void;
  readonly onDecrease: (id: string) => void;
  readonly onToggleCompare: (id: string) => void;
  // Only the tile being opened, or returned to, carries the shared image name.
  readonly travels: boolean;
  readonly onOpen: (id: string) => void;
}

export const tileSizes = "(min-width: 1180px) 25vw, (min-width: 760px) 33vw, 50vw";

export const ProductTile = memo(function ProductTile({ product, locale, text, quantity, compared, compareFull, eager, onAdd, onDecrease, onToggleCompare, travels, onOpen }: Props) {
  const name = product.name[locale];
  const limit = orderLimit(product);
  const hasAngle = availableViews(product.id).includes("angle");
  // The second view loads on first hover, so filtering never decodes hidden images.
  const [showAlternate, setShowAlternate] = useState(false);
  return (
    <motion.li
      className="tile"
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
    >
      <a className="tile-link" href={href.product(product.id)} onPointerEnter={(event) => event.pointerType === "mouse" && setShowAlternate(true)} onClick={() => onOpen(product.id)}>
        <div className={`tile-media${hasAngle ? " has-alternate" : ""}`}>
          <ProductImage
            id={product.id}
            view="hero"
            alt={`${product.type[locale]} ${name}`}
            sizes={tileSizes}
            missingText={text.imageMissing}
            eager={eager}
            transitionName={travels ? `object-${product.id}` : undefined}
          />
          {hasAngle && showAlternate && <ProductImage id={product.id} view="angle" alt="" sizes={tileSizes} missingText="" className="tile-alternate" />}
        </div>
        <div className="tile-heading">
          <h3 className="tile-name">{name}</h3>
          <span className="tile-price">{formatPrice(product.priceCents, locale)}</span>
        </div>
        <p className="tile-type">{product.type[locale]}</p>
        <p className="tile-material">{product.materialLine[locale]}</p>
      </a>
      <div className="tile-footer">
        <AvailabilityLine availability={product.availability} locale={locale} />
        <div className="tile-actions">
          <label className={`compare-toggle${compareFull && !compared ? " is-disabled" : ""}`} title={compareFull && !compared ? text.compareFull : undefined}>
            <input type="checkbox" checked={compared} disabled={compareFull && !compared} onChange={() => onToggleCompare(product.id)} aria-label={text.compareNamed(name)} />
            <span aria-hidden="true">{text.compare}</span>
          </label>
          {limit === 0 ? null : quantity > 0 ? (
            <QuantityStepper name={name} quantity={quantity} limit={limit} text={text} onDecrease={() => onDecrease(product.id)} onIncrease={() => onAdd(product)} />
          ) : (
            <button type="button" className="add-button" onClick={() => onAdd(product)} aria-label={text.addNamed(name)}>
              {text.add}
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
});
