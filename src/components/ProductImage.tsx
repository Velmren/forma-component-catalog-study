import { useState } from "react";
import { imageSet } from "../media.ts";
import type { ProductView } from "../types.ts";

interface Props {
  readonly id: string;
  readonly view: ProductView;
  readonly alt: string;
  readonly sizes: string;
  readonly missingText: string;
  readonly eager?: boolean | undefined;
  readonly transitionName?: string | undefined;
  readonly className?: string | undefined;
}

export function ProductImage({ id, view, alt, sizes, missingText, eager, transitionName, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const style = transitionName ? { viewTransitionName: transitionName } : undefined;
  if (failed) {
    return (
      <div className={`product-image image-missing ${className}`} style={style} role="img" aria-label={alt}>
        <span>{missingText}</span>
      </div>
    );
  }
  const { src, srcSet } = imageSet(id, view);
  return (
    <img
      className={`product-image ${className}`}
      style={style}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={1440}
      height={1800}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
