# mtg-deck

A Magic: The Gathering card browser and deck builder for the web. It currently includes
**Guilds of Ravnica** and **Ravnica Allegiance**; more sets and format rules can be added
without touching the UI.

- Browse and filter cards by text, color, guild, type, rarity, mana value, and set.
  Searches are kept in the URL, so you can bookmark or share them.
- Build decks with a main deck and sideboard, and check them live against 60-card
  constructed rules (Pioneer, Standard, Modern, Legacy, Vintage, Pauper, Casual).
- See the mana curve, colored mana symbols, land/spell split, and an estimated price
  from TCGplayer.
- Import and export decklists in MTG Arena or MTGO/plain-text format.
- Decks are saved in your browser (localStorage). Nothing is sent to a server.

## Getting started

Requires Node 20.19+ or 22.12+.

```sh
npm install
npm run dev        # http://localhost:5173
```

| Script               | What it does                                                                        |
| -------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`        | Start the dev server                                                                |
| `npm run build`      | Type-check and build to `dist/`                                                     |
| `npm test`           | Unit tests (Vitest)                                                                 |
| `npm run e2e`        | Browser and accessibility tests (Playwright + axe; builds and serves the app first) |
| `npm run lint`       | Lint (oxlint)                                                                       |
| `npm run fetch-data` | Re-download card data from Scryfall                                                 |

The first time you run the browser tests, run `npx playwright install chromium`.

## Card data

Card data and images come from [Scryfall](https://scryfall.com/docs/api). TCGplayer prices
are included in Scryfall's data. `npm run fetch-data` downloads every set listed in
`sets.config.json` into `public/data/`, which is committed so the app works offline and
never hits the API at runtime. Prices are a snapshot from the time of the fetch.

### Adding a set

1. Add the set code (e.g. `"rna"`) to `sets.config.json`.
2. Run `npm run fetch-data`. The script warns if the card count doesn't match Scryfall's.
3. Commit the updated `public/data/` files.

## Project layout

```
scripts/            Build-time Scryfall fetch
src/domain/         Pure logic, no React: card model, search, deck, decklist, formats
src/domain/formats/ Format rules; register new formats in registry.ts
src/data/           Loads the card snapshot into an indexed CardDb
src/storage/        Versioned localStorage deck store
src/ui/             React components (browser, card detail, deck panel)
e2e/                Playwright tests
```

### Adding a format

Implement `FormatRules` (`src/domain/formats/types.ts`), or call `constructedFormat()` with
a Scryfall legality key, and add it to `FORMATS` in `registry.ts`.

## Legal

This is unofficial Fan Content permitted under the
[Wizards of the Coast Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy).
It is not approved or endorsed by Wizards. Portions of the materials used are property of
Wizards of the Coast. © Wizards of the Coast LLC. Card data and images are provided by
Scryfall.
