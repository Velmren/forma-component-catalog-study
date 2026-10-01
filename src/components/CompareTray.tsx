import { AnimatePresence, motion } from "motion/react";
import type { Copy } from "../i18n.ts";
import { imageSet } from "../media.ts";
import { href } from "../router.ts";
import type { Locale, Product } from "../types.ts";

interface Props {
  readonly products: readonly Product[];
  readonly locale: Locale;
  readonly text: Copy;
  readonly onRemove: (id: string) => void;
  readonly onClear: () => void;
}

export function CompareTray({ products, locale, text, onRemove, onClear }: Props) {
  return (
    <AnimatePresence>
      {products.length > 0 && (
        <motion.aside
          className="compare-tray"
          aria-label={text.compareTitle}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        >
          <ul>
            <AnimatePresence initial={false}>
              {products.map((product) => (
                <motion.li key={product.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                  <img src={imageSet(product.id, "hero").thumbnail} alt="" width={48} height={60} decoding="async" />
                  <button type="button" onClick={() => onRemove(product.id)} aria-label={`${text.remove}: ${product.name[locale]}`}>
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <button type="button" className="text-button" onClick={onClear}>
            {text.clear}
          </button>
          {products.length > 1 ? (
            <a className="primary-button" href={href.compare()}>
              {text.compareCount(products.length)}
            </a>
          ) : (
            <span className="tray-hint">{text.compareEmpty}</span>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
