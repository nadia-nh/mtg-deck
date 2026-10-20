import { useMemo, useState } from 'react'
import type { Card } from '../domain/card'
import type { CardDb } from '../data/loadCards'
import { describeFilter } from '../domain/describeFilter'
import { searchCards, uniqueByName } from '../domain/search'
import { CardGrid } from './CardGrid'
import { useCollection } from './collection/collectionContext'
import { CardTable } from './CardTable'
import { loadDensity, saveDensity, type Density } from './density'
import type { CopyAllowance } from './deck/deckContext'
import { FilterPanel } from './FilterPanel'
import { loadFiltersOpen, saveFiltersOpen } from './filtersOpen'
import { ResultsToolbar } from './ResultsToolbar'
import { useBrowseState } from './useBrowseState'

interface Props {
  db: CardDb
  onSelect?: (card: Card) => void
  onAdd?: (card: Card) => void
  deckCounts?: ReadonlyMap<string, number>
  copyAllowance?: (card: Card) => CopyAllowance
}

export function CardBrowser({ db, onSelect, onAdd, deckCounts, copyAllowance }: Props) {
  const [state, setState] = useBrowseState()
  // Collapsed on narrow screens; on wider ones, a closed drawer becomes a slim rail.
  const [filtersOpen, setFiltersOpen] = useState(() =>
    loadFiltersOpen(window.matchMedia?.('(max-width: 760px)').matches ?? false),
  )
  const [density, setDensity] = useState<Density>(loadDensity)
  const changeDensity = (d: Density) => {
    setDensity(d)
    saveDensity(d)
  }
  const { owned } = useCollection()
  const results = useMemo(() => {
    const found = searchCards(db.cards, state.filter, state.sort, (name) => (owned[name] ?? 0) > 0)
    if (state.filter.allPrintings) return found
    // One tile per card name, using the preferred printing among the matches.
    return uniqueByName(found, (c) => db.byName.get(c.name)?.indexOf(c) ?? 0)
  }, [db, state.filter, state.sort, owned])
  const activeFilters = describeFilter(state.filter).length

  return (
    <div className="browser">
      <aside>
        <details
          className="filters-drawer"
          open={filtersOpen}
          onToggle={(e) => {
            const open = e.currentTarget.open
            if (open === filtersOpen) return // the initial render's toggle event
            setFiltersOpen(open)
            saveFiltersOpen(open)
          }}
        >
          <summary>
            Filters
            {activeFilters > 0 && (
              <>
                {' '}
                <span className="filter-count" data-testid="filter-count">
                  {activeFilters}
                </span>
                <span className="visually-hidden"> active</span>
              </>
            )}
          </summary>
          <FilterPanel state={state} sets={db.manifest.sets} onChange={setState} />
        </details>
      </aside>
      <section aria-labelledby="results-heading">
        <ResultsToolbar
          state={state}
          sets={db.manifest.sets}
          count={results.length}
          onChange={setState}
          density={density}
          onDensityChange={changeDensity}
        />
        {density === 'list' ? (
          <CardTable
            cards={results}
            sort={state.sort}
            onSort={(sort) => setState({ ...state, sort })}
            onSelect={onSelect}
            onAdd={onAdd}
            deckCounts={deckCounts}
            copyAllowance={copyAllowance}
          />
        ) : (
          <CardGrid
            density={density}
            cards={results}
            onSelect={onSelect}
            onAdd={onAdd}
            deckCounts={deckCounts}
            copyAllowance={copyAllowance}
          />
        )}
      </section>
    </div>
  )
}
