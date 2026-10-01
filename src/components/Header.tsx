import { motion } from "motion/react";
import { formatPrice } from "../i18n.ts";
import type { Copy } from "../i18n.ts";
import { href } from "../router.ts";
import type { Route } from "../router.ts";
import type { Locale } from "../types.ts";

interface Props {
  readonly route: Route;
  readonly locale: Locale;
  readonly text: Copy;
  readonly itemCount: number;
  readonly totalCents: number;
  readonly compareCount: number;
  readonly onLocale: (locale: Locale) => void;
  readonly onOpenSelection: () => void;
}

const locales: readonly Locale[] = ["ru", "en"];

export function Header({ route, locale, text, itemCount, totalCents, compareCount, onLocale, onOpenSelection }: Props) {
  return (
    <header className="site-header">
      <a className="wordmark" href={href.catalogue()} aria-label="FORMA">
        FORMA
      </a>
      <nav className="site-nav">
        <a href={href.catalogue()} aria-current={route.name === "catalogue" ? "page" : undefined}>
          {text.nav.catalogue}
        </a>
        <a href={href.compare()} aria-current={route.name === "compare" ? "page" : undefined}>
          {text.nav.compare}
          {compareCount > 0 && <span className="nav-count">{compareCount}</span>}
        </a>
      </nav>
      <div className="header-tools">
        <div className="language" role="group" aria-label={text.language}>
          {locales.map((value) => (
            <button key={value} type="button" lang={value} aria-pressed={locale === value} onClick={() => onLocale(value)}>
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <button type="button" className="selection-button" onClick={onOpenSelection} aria-haspopup="dialog">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 7h12l-1 10H5L4 7Z" />
            <path d="M7.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
          </svg>
          <span className="selection-label">{text.nav.selection}</span>
          <motion.span
            key={itemCount}
            className={`selection-count${itemCount === 0 ? " is-empty" : ""}`}
            initial={{ scale: itemCount ? 1.35 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
          >
            {itemCount}
          </motion.span>
          {itemCount > 0 && <span className="selection-total">{formatPrice(totalCents, locale)}</span>}
        </button>
      </div>
    </header>
  );
}
