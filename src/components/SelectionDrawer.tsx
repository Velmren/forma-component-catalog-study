import { forwardRef, useState } from "react";
import { cartTotalCents, orderLimit, slowestLine } from "../catalog.ts";
import { formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import { imageSet } from "../media.ts";
import { href } from "../router.ts";
import type { Cart, Locale, Product } from "../types.ts";
import { QuantityStepper } from "./QuantityStepper.tsx";

interface Props {
  readonly cart: Cart;
  readonly locale: Locale;
  readonly text: Copy;
  readonly saved: boolean;
  readonly onAdd: (product: Product) => void;
  readonly onDecrease: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onClear: () => void;
}

export const SelectionDrawer = forwardRef<HTMLDialogElement, Props>(function SelectionDrawer(
  { cart, locale, text, saved, onAdd, onDecrease, onRemove, onClear },
  ref,
) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const close = () => (ref && "current" in ref ? ref.current?.close() : undefined);
  const total = cartTotalCents(cart);
  const slowest = slowestLine(cart);

  const copyList = async () => {
    const lines = cart.map(({ product, quantity }) => `${product.name[locale]}, ${product.type[locale].toLocaleLowerCase()}: ${quantity} × ${formatPrice(product.priceCents, locale)}`);
    try {
      await navigator.clipboard.writeText([...lines, `${text.subtotal}: ${formatPrice(total, locale)}`].join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <dialog ref={ref} className="drawer" aria-labelledby="selection-title" onClick={(event) => event.target === event.currentTarget && close()} onClose={() => setCopyState("idle")}>
      <div className="drawer-body">
        <header className="drawer-header">
          <h2 id="selection-title">{text.selection}</h2>
          <button type="button" className="icon-button" onClick={close} aria-label={text.close}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
          </button>
        </header>
        {cart.length === 0 ? (
          <div className="drawer-empty">
            <p className="drawer-empty-title">{text.selectionEmpty}</p>
            <p>{text.selectionEmptyText}</p>
            <a className="secondary-button" href={href.catalogue()} onClick={close}>
              {text.toCatalogue}
            </a>
          </div>
        ) : (
          <>
            <ul className="lines">
              {cart.map(({ product, quantity }) => (
                <li key={product.id} className="line">
                  <img src={imageSet(product.id, "hero").thumbnail} alt="" width={64} height={80} decoding="async" />
                  <div className="line-info">
                    <a href={href.product(product.id)} onClick={close} className="line-name">
                      {product.name[locale]}
                    </a>
                    <span className="line-type">{product.type[locale]}</span>
                    <QuantityStepper
                      name={product.name[locale]}
                      quantity={quantity}
                      limit={orderLimit(product)}
                      text={text}
                      onDecrease={() => onDecrease(product.id)}
                      onIncrease={() => onAdd(product)}
                    />
                  </div>
                  <div className="line-end">
                    <span className="line-total">{formatPrice(product.priceCents * quantity, locale)}</span>
                    <button type="button" className="text-button" onClick={() => onRemove(product.id)} aria-label={text.removeNamed(product.name[locale])}>
                      {text.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="summary-lines">
              <div>
                <dt>{text.subtotal}</dt>
                <dd className="summary-total">{formatPrice(total, locale)}</dd>
              </div>
              {slowest && (
                <div>
                  <dt>{text.arrival}</dt>
                  <dd>{"weeks" in slowest ? text.arrivalWeeks(slowest.weeks, slowest.product.name[locale]) : text.arrivalDays(slowest.days)}</dd>
                </div>
              )}
            </dl>
            <div className="drawer-actions">
              <button type="button" className="primary-button" onClick={copyList}>
                {copyState === "copied" ? text.copied : copyState === "failed" ? text.copyFailed : text.copyList}
              </button>
              <button type="button" className="text-button" onClick={onClear}>
                {text.clear}
              </button>
            </div>
          </>
        )}
        <footer className="drawer-footer">
          <p>{saved ? text.saved : text.notSaved}</p>
          <p>{text.noCheckout}</p>
        </footer>
      </div>
    </dialog>
  );
});
