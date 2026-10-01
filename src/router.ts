import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type Route =
  | { readonly name: "catalogue"; readonly query: string }
  | { readonly name: "product"; readonly id: string }
  | { readonly name: "compare" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "");
  const product = path.match(/^\/object\/([a-z0-9-]+)$/);
  if (product?.[1]) return { name: "product", id: product[1] };
  if (path === "/compare") return { name: "compare" };
  const query = path.startsWith("/?") ? path.slice(2) : "";
  return { name: "catalogue", query };
}

export const href = {
  catalogue: (query = "") => (query ? `#/?${query}` : "#/"),
  product: (id: string) => `#/object/${id}`,
  compare: () => "#/compare",
};

const scrollPositions = new Map<string, number>();
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Route changes run inside a view transition so the product image can travel from the
// grid to the product page. Scroll is set inside the same update so snapshots line up.
function transition(update: () => void) {
  if (!document.startViewTransition || reducedMotion()) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

function restoreScroll(route: Route) {
  const saved = route.name === "catalogue" ? scrollPositions.get("catalogue") : undefined;
  window.scrollTo({ top: saved ?? 0, behavior: "instant" });
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  const current = useRef(route);
  current.current = route;

  useEffect(() => {
    const onHashChange = () => {
      const next = parseHash(location.hash);
      if (current.current.name === "catalogue") scrollPositions.set("catalogue", window.scrollY);
      transition(() => {
        setRoute(next);
        restoreScroll(next);
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Filter edits replace the entry so typing does not flood the history.
  const replaceQuery = useCallback((query: string) => {
    history.replaceState(null, "", href.catalogue(query));
    setRoute({ name: "catalogue", query });
  }, []);

  return { route, replaceQuery };
}
