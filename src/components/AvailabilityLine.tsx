import { availabilityText } from "../i18n.ts";
import type { Availability, Locale } from "../types.ts";

export function AvailabilityLine({ availability, locale, detailed = false }: { readonly availability: Availability; readonly locale: Locale; readonly detailed?: boolean }) {
  const { label, detail } = availabilityText(availability, locale);
  return (
    <p className="availability" data-kind={availability.kind}>
      <span className="availability-mark" aria-hidden="true" />
      <span className="availability-label">{label}</span>
      {detailed && <span className="availability-detail">{detail}</span>}
    </p>
  );
}
