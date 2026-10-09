# CLAUDE.md

Guidance for Claude Code working in this repo. If `docs/HANDOFF.md` exists locally (it is
git-ignored), read it for project history, current status, and next steps.

## Project

**mtg-deck**: a web card browser and 60-card deck builder for Magic: The Gathering.
React 19 + TypeScript + Vite. Card data comes from Scryfall and is snapshotted into
`public/data/` at build time; there is no backend. Decks live in the browser's localStorage.

## Commands

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest unit/component tests
npm run e2e          # Playwright browser + axe accessibility tests (builds and serves first)
npm run lint         # oxlint
npx prettier --check src e2e scripts   # formatting (CI-style check)
npm run build        # tsc -b + vite build
npm run fetch-data   # re-download sets listed in sets.config.json from Scryfall
npm run vendor:mana  # regenerate src/styles/vendor/mana.css after upgrading mana-font
```

First-time e2e setup: `npx playwright install chromium`. To use an already-installed
Chromium instead, set `PW_CHROMIUM_PATH=/path/to/chrome`.

## Definition of done (every change)

1. `npm test`, `npm run lint`, `npx tsc -b`, the prettier check, and `npm run e2e` all pass.
   CI (`.github/workflows/ci.yml`) runs the same checks on every pull request.
2. UI changes: take screenshots at **1440×900 and 390×844, light and dark**, and look at them
   (layout, overflow, contrast). The axe tests must stay at zero violations.
3. **Small commits**: one visible change per commit, with tests in the same commit. The commit
   message has an imperative subject and a short body saying _why_. Nadia asked for this
   explicitly.
4. Tick items in `docs/ui-plan.md` when a plan step lands (and update the local
   `docs/HANDOFF.md` status, if present).

## Architecture rules

- **`src/domain/` is pure TypeScript with no React.** Card model, search, deck, decklist,
  and formats live here. New game logic goes here with unit tests first.
- Components in `src/ui/` stay thin; state lives in `DeckProvider` (deck) and
  `useBrowseState` (filters, mirrored to URL query params).
- Decks are keyed by **card name**, not printing. `CardDb.byName` lists printings in
  preference order (`comparePrintings`: newest set, regular before ★ alt-art, lowest number).
- New format: implement `FormatRules` or call `constructedFormat()`, then register it in
  `src/domain/formats/registry.ts`.
- New set: add its code to `sets.config.json`, run `npm run fetch-data`, and commit
  `public/data/`. No code changes should be needed. The e2e tests read counts from the
  manifest.
- Styling: **only design tokens** from `src/styles/tokens.css` (colors use `light-dark()`;
  the theme is set via `<html data-theme>`). Don't hard-code colors or spacing in components
  or feature CSS.
- Mana symbols: use `<ManaCost>` / `<RulesText>` (`src/ui/mana/`). The Mana font is
  self-hosted as woff2 only. Don't import `mana-font/css/*` directly, because that pulls in
  eot/ttf/svg copies and the MPlantin font, which has unclear licensing.
- Accessibility: buttons that only show an icon need an `aria-label`. Symbol groups use
  `role="img"` with a spoken label. Keep keyboard focus visible (a global `:focus-visible`
  ring exists).
- localStorage access is always wrapped in try/catch (private mode, quota). See
  `src/storage/decks.ts` and `src/ui/theme.ts`.

## Data and licensing notes

- Scryfall API rules: send `User-Agent` + `Accept` headers and wait about 100 ms between
  requests (already done in `scripts/scryfall.ts`).
- TCGplayer prices come inside Scryfall data and are a snapshot from fetch time. The
  TCGplayer API itself is closed to new developers, so don't use it.
- Keep the fan-content notice (footer + README). The logo is original art; don't use WotC
  logos or set/guild art beyond the Mana font's symbols.
