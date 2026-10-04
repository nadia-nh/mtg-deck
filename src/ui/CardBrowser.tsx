import { useMemo, useState } from 'react'
import type { Card } from '../domain/card'
import type { CardDb } from '../data/loadCards'
import { searchCards, uniqueByName } from '../domain/search'
import { CardGrid } from './CardGrid'
import { FilterPanel } from './FilterPanel'
import { useBrowseState } from './useBrowseState'

interface Props {
  db: CardDb
  onSelect?: (card: Card) => void
  onAdd?: (card: Card) => void
  deckCounts?: ReadonlyMap<string, number>
}

export function CardBrowser({ db, onSelect, onAdd, deckCounts }: Props) {
  const [state, setState] = useBrowseState()
  // Filters start collapsed on narrow screens so cards are visible first.
  const [filtersOpen, setFiltersOpen] = useState(
    () => !window.matchMedia?.('(max-width: 760px)').matches,
  )
  const results = useMemo(() => {
    const found = searchCards(db.cards, state.filter, state.sort)
    if (state.filter.allPrintings) return found
    // One tile per card name, using the preferred printing among the matches.
    return uniqueByName(found, (c) => db.byName.get(c.name)?.indexOf(c) ?? 0)
  }, [db, state.filter, state.sort])

  return (
    <div className="browser">
      <aside>
        <details
          className="filters-drawer"
          open={filtersOpen}
          onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
        >
          <summary>Filters</summary>
          <FilterPanel state={state} sets={db.manifest.sets} onChange={setState} />
        </details>
      </aside>
      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="result-count" aria-live="polite">
          {results.length} {results.length === 1 ? 'card' : 'cards'}
        </h2>
        <CardGrid cards={results} onSelect={onSelect} onAdd={onAdd} deckCounts={deckCounts} />
      </section>
    </div>
  )
}
