# UI improvement plan

> **Status:** Phase A and Phase B are done. Set symbols show in the detail view; List view
> (C2) will reuse `<SetIcon>`. Not done: the set filter is a native `<select>`, which can't
> show icons, and deck rows are keyed by name, so they have no single set. C1 (filter chips,
> with sort moved into the results toolbar) and C2 (Large / Small / List, with set symbols in
> List) are done. D1 (deck panel tabs, with the deck controls pinned on desktop) and D2
> (hover/focus card preview) are done. D3 (toasts with Undo, plus Ctrl/Cmd+Z) is done, so
> Phase D is complete. E1 (Browse / Deck switch) and E2 (stacked mana-value columns; phones
> keep an image grid) are done. Next: E3 (C3 virtualization waits for 2,000+ cards).

Goal: make mtg-deck feel like a polished MTG tool while keeping it fast, accessible and
tested. The style direction is **polished neutral**: a clean, quiet interface where the card art
stands out, with a manual light/dark toggle.

Ground rules for every step:

- Small commits: one visible change per commit, each with its own tests.
- Every step ends with `npm test`, `npm run lint`, `npm run e2e` (which includes the axe
  accessibility tests), plus screenshots at desktop and phone widths in light and dark mode.
- Logic goes in pure modules with unit tests; components stay thin.
- No new runtime dependencies unless listed below.

New dependencies (all permissively licensed):

| Package                   | Why                               | License       |
| ------------------------- | --------------------------------- | ------------- |
| `mana-font`               | Mana and guild symbols as a font  | MIT + SIL OFL |
| `@tanstack/react-virtual` | Render only the visible grid rows | MIT           |

Set symbols come from Scryfall's set icon SVGs (`iconSvgUri`, already in the manifest), so
no extra package is needed.

---

## Phase A: Foundations (look and feel)

| #   | Step                                                                                                                                                                           | Verify                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| A1  | **Design tokens:** consolidate colors, spacing (4px scale), radii, shadows and type sizes as CSS variables. No visual change yet; this replaces repeated values.               | Before/after screenshots look the same; the CSS file gets smaller.                  |
| A2  | **Theme toggle:** a Light / Dark / System switch in the header, stored in localStorage (with a safe fallback) and applied via `data-theme`.                                    | Unit test for the preference store; e2e: toggle → reload → theme kept; axe in both. |
| A3  | **Header and typography polish:** an app name/logo mark, a tidier header with deck name and validity, consistent heading sizes and focus rings, and hover/raise on card tiles. | Screenshots; keyboard-only walkthrough (Tab order, visible focus).                  |

## Phase B: MTG symbols

| #   | Step                                                                                                                                                                                                          | Verify                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| B1  | **`ManaCost` component:** parses `{2}{W}{U/R}{X}` and similar into `mana-font` symbols, each with an accessible label (e.g. "2 generic, white, blue or red"). Used in the deck list, detail dialog and curve. | Unit tests for the parser (hybrid, phyrexian, split "//", X, snow); axe: symbols have names. |
| B2  | **Mana symbols in rules text:** render `{T}` and costs inside rules text with the same symbols.                                                                                                               | Unit test on real rules text (Teferi, Firemind's Research).                                  |
| B3  | **Set and guild symbols:** set icons next to set names (detail view, set filter, deck rows); guild symbols in the guild filter and as color-pip buttons.                                                      | Screenshots; e2e: set icon has alt text naming the set.                                      |

## Phase C: Browsing

| #   | Step                                                                                                                                                                                           | Verify                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| C1  | **Active filter chips:** a toolbar above the grid showing "Izzet ×", "Rare ×", "MV 2–3 ×" and so on, plus result count, sort and "Clear all". Chip labels come from a pure `describeFilter()`. | Unit tests for `describeFilter`; e2e: removing a chip updates the URL and results.           |
| C2  | **Density toggle:** Large / Small / List. List view is a table: name, cost, type, rarity, set, price, and add. Remembered per browser.                                                         | e2e for each mode; axe on the table view; the List table is sortable by its column headers.  |
| C3  | **Virtualized grid:** render only the rows near the viewport (all three densities), keeping the result-count heading as the source of truth.                                                   | Performance check with 2,000+ cards (DOM node count, scroll FPS); e2e updated to use counts. |

## Phase D: Deck panel

| #   | Step                                                                                                                                                                                                   | Verify                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| D1  | **Pinned header and tabs:** the deck picker, format and validity line stay pinned; below them, tabs for **Cards / Stats / Import-Export**, using the accessible tab pattern (arrow keys).              | e2e: switch tabs with the keyboard; axe; existing deck tests still pass.                |
| D2  | **Hover preview:** hovering or focusing a deck-list name shows the card image in a floating preview (desktop). On touch, tapping still opens the detail dialog.                                        | e2e: hover shows image with the right alt text; no preview on touch emulation.          |
| D3  | **Toasts with Undo:** "Added Lava Coil · Undo" and "Removed… · Undo", shown in an `aria-live` region. Undo restores the previous deck from a small history stack, which also covers import and delete. | Unit tests for the history stack; e2e: add → Undo → count restored; delete deck → Undo. |

## Phase E: Visual deck view

| #   | Step                                                                                                                                                                                                        | Verify                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| E1  | **Browse / Deck switch:** a header toggle (URL `view=deck`) switches the main area between the card browser and a full-width deck view.                                                                     | e2e: switch views, back button returns, deep link works.                           |
| E2  | **Stacked columns:** card images stacked in columns by mana value, with lands in their own column, counts on each stack and the sideboard below. Clicking opens the detail view; +/- appear on hover/focus. | Screenshots with a 60-card deck; e2e: counts per column match `deckStats().curve`. |
| E3  | **Group-by option:** group the columns by mana value, by type, or by color.                                                                                                                                 | Unit tests for grouping; e2e switch.                                               |

## Phase F: Mobile

| #   | Step                                                                                                                                                   | Verify                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| F1  | **Bottom deck bar:** below 1100px, a sticky bottom bar shows "Boros Aggro · 42/60 · ✗". The collapsed panel at the top is removed.                     | e2e at 390×844: bar visible, counts update on add.                |
| F2  | **Slide-up sheet:** tapping the bar opens the deck panel as a sheet built on `<dialog>` (focus trapped, Esc and swipe-down to close, safe-area aware). | e2e: open/close, focus returns to the bar; axe in the open state. |

## Phase G: Sample hand

| #   | Step                                                                                                                                                                            | Verify                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| G1  | **Pure `sampleHand` module:** shuffle (Fisher–Yates with an injectable random number generator), draw 7, London mulligan (draw 7, put N on the bottom), and draw the next card. | Unit tests with a seeded random number generator; a statistical sanity test (land count averages near 7 × lands/60). |
| G2  | **Sample hand UI:** a "Draw sample hand" button in the deck panel that opens a dialog with the hand images, plus Mulligan / Draw / New hand and a "lands in hand" summary.      | e2e with a fixed seed (`?seed=` for tests only); axe on the dialog.                                                  |

---

## Suggested order and size

A → B → C1–C2 → D → E → F → C3 → G. Roughly 20 small commits. C3 (virtualization) can wait until
the card pool grows past about 2,000 cards, since today's ~850 still renders smoothly.

## Future ideas (not scheduled)

Requests from Nadia, kept here so they aren't lost. Each needs a short design pass before it
becomes a numbered step.

- **Mark cards as owned.** A per-browser collection (card name → copies owned), stored in
  localStorage like decks. Possible UI: an "Owned" toggle/count in the detail dialog, an
  "Owned only" browse filter, and "missing N cards" (with price) in the deck panel. Open
  question: track owned per name (simpler, matches decks) or per printing (needed for
  foils/alt-arts)?
- **Random deck names.** New decks start with a random name (e.g. adjective + noun, or
  guild-flavored once colors are known) instead of "Untitled deck". After a few cards are
  added, offer a name based on the deck's colors (e.g. "Boros Aggro"), but **only if the
  user hasn't edited the name** — store a `nameEdited` flag on the deck.
- Import/export already covers Arena and MTGO formats; no work needed there.

## Open questions

- **Visual deck view on phones:** stacked columns are too wide for phones. The plan shows a
  2-column grid of images there instead. Is that acceptable?
- **Undo scope:** should Undo also cover deck renames and format changes, or only card
  changes, import and delete? The plan currently does card changes, import and delete.
