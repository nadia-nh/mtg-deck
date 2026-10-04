import { useLayoutEffect, useRef } from 'react'
import type { SetEntry } from '../data/manifest'
import { describeFilter } from '../domain/describeFilter'
import type { SortKey } from '../domain/search'
import type { BrowseState } from './filterParams'
import { XIcon } from './icons'

const SORT_LABELS: Record<SortKey, string> = {
  number: 'Collector number',
  name: 'Name',
  cmc: 'Mana value',
  price: 'Price (high → low)',
  rarity: 'Rarity',
}

interface Props {
  state: BrowseState
  sets: SetEntry[]
  count: number
  onChange: (next: BrowseState) => void
}

/** Result count, one removable chip per active filter, "Clear all", and the sort order. */
export function ResultsToolbar({ state, sets, count, onChange }: Props) {
  const chips = describeFilter(state.filter, (code) => sets.find((s) => s.code === code)?.name)
  const listRef = useRef<HTMLUListElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // After a chip (or all of them) is removed, its button is gone; keep focus nearby.
  const refocus = useRef<number | null>(null)

  useLayoutEffect(() => {
    const index = refocus.current
    if (index == null) return
    refocus.current = null
    const buttons = listRef.current?.querySelectorAll('button')
    const next = buttons?.[Math.min(index, buttons.length - 1)]
    ;(next ?? headingRef.current)?.focus()
  })

  return (
    <div className="results-toolbar">
      <h2
        id="results-heading"
        ref={headingRef}
        tabIndex={-1}
        className="result-count"
        aria-live="polite"
      >
        {count} {count === 1 ? 'card' : 'cards'}
      </h2>
      {chips.length > 0 && (
        <>
          <ul ref={listRef} className="filter-chips" role="list" aria-label="Active filters">
            {chips.map((chip, i) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className="chip"
                  aria-label={`Remove filter: ${chip.label}`}
                  onClick={() => {
                    refocus.current = i
                    onChange({ ...state, filter: chip.remove(state.filter) })
                  }}
                >
                  {chip.label}
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="chip-clear"
            onClick={() => {
              refocus.current = 0
              onChange({ ...state, filter: {} })
            }}
          >
            Clear all
          </button>
        </>
      )}
      <label className="toolbar-sort">
        <span>Sort by</span>
        <select
          value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value as SortKey })}
        >
          {Object.entries(SORT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
