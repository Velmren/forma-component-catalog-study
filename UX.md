# FORMA UX and visual direction

## Audience and goal

Assumption from the scope: people furnishing a room who want to narrow a small range by material and price, look closely at a few objects, check whether they fit, and keep a combination with a total. No customer research or conversion data exists; the decisions below come from the task and from studying working furniture catalogues.

## Concept

A catalogue arranged around materials. The first screen states the range plainly (twelve objects in seven materials) and turns the material list into the first filter. Each object carries its materials part by part and exact dimensions. Because every image comes from a parametric model, the catalogue can show what photographs cannot: a dimensioned front elevation for each object and a comparison where objects stand at one scale.

## Critical tasks

1. Narrow the range by material, category, price or availability, and recover when nothing matches.
2. Open an object, read its size, materials, care and lead time, and see it from more than one side.
3. Put two to four objects side by side and see how they differ, including their real size.
4. Keep a selection within stock or batch limits, see the total and the longest wait, and find it again later.
5. Switch language without losing filters, selection or comparison.
6. Do all of the above on a phone and with the keyboard.

## What the studied catalogues showed

HAY, Muuto, Vitra, &Tradition, Audo, Hem, SCP, Ferm Living, Louis Poulsen and String were reviewed on desktop and several on a 390 px phone. Adopted: product shots on an even studio ground with a second view on hover; editorial tiles set into the grid at tile size instead of separate banners; availability as both a filter and a line by the action; filters with live counts, visible chips and state in the address; specifications as a label/value table split by part; a sticky summary beside a long gallery. Avoided: pop-ups before the catalogue, one tile per colour, filters that push products several screens down on phones, and empty frames while images load. None of the reviewed shops offered a side-by-side comparison; FORMA builds one from the same data.

## Visual specification

- **Zones.** Sticky header (wordmark, catalogue and comparison, language, selection with count and total). Introduction with the statement on the left and the explanation plus material index on the right. A sticky toolbar with category tabs and result count, then filters, search and order. A four-column grid on desktop, three on tablets, two on phones.
- **Type.** Onest throughout. Statement 64 px/0.98 at 1440 px, product name on its page 48 px, tile name 18 px semibold, body 16 px, secondary 14 px, captions 13 px. Prices and counts use tabular figures. No uppercase labels or decorative numbering.
- **Colour.** White page, near-black ink `#121211`, secondary `#57564f`, hairlines `#e6e5e1`. Renders sit on their own neutral studio ground. Cobalt `#2745c8` marks only selected filters, counts and focus. Availability uses a filled green dot (in stock), an amber ring (made to order) and a grey dot (sold out), always with text.
- **Shape.** 8 px radius for controls, 4 px for images, pills only for the material index and filter chips. Hairlines separate groups; cards are not boxed.
- **Density.** Tiles keep a fixed internal order: image, name and price, type, material, then availability and actions under a hairline.
- **Phones.** The statement shrinks to two lines, materials become one swipeable row, filters move into a bottom sheet with a "show N objects" button, tiles put the add action at full width, the product gallery swipes with a counter and a purchase bar stays at the bottom.

## Motion

- Grid to product page: the image keeps its identity through a view transition while the rest cross-fades; the header does not move.
- Filtering: tiles enter, leave and reflow with layout animation (transform and opacity only).
- Adding: the selection count springs, the tile action turns into a quantity stepper.
- Panels: the selection drawer slides in, the filter sheet rises, the comparison tray lifts in when an object is ticked.
- Lists: the material, price and order lists open with a short fade and 4 px lift from their trigger, flip upwards or leftwards at the window edge, and rise as a bottom sheet on phones.
- `prefers-reduced-motion` disables view transitions and reduces all animation to state changes.

## States

Catalogue: default, filtered, active chips, empty result with reset and material shortcuts. Tiles: in stock, made to order, sold out (no add action), in selection, at stock limit, compared, comparison full. Product page: unknown object, missing image, sold out. Selection: empty, filled, at limit, copied, copy failed, saved, storage blocked. Comparison: fewer than two objects, differences only.

## Verification method

Developer scenarios in Chromium through Playwright, at 1440×900, 390×844 and 320×640, plus seven logic tests; see `scripts/check-flows.mjs` for the exact checks. Frame pacing is measured by `scripts/record-motion.mjs` on the production build: hover, filtering, adding, panels, product transitions, gallery swipe and comparison run at 60 fps; route changes cost one 33 ms frame for the view-transition snapshot, and the comparison tray's first appearance one frame of up to 66 ms. Tiles are memoised and load their second view only on hover so filtering does not decode hidden images.
