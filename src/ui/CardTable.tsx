import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { Card } from '../domain/card'
import type { SortKey } from '../domain/search'
import { limitReachedText, type CopyAllowance } from './deck/deckContext'
import { usd } from './format'
import { PlusIcon } from './icons'
import { ManaCost } from './mana/ManaCost'
import { SetIcon } from './SetIcon'
import { useDocumentTop } from './useDocumentTop'

interface Props {
  cards: Card[]
  sort: SortKey
  onSort: (sort: SortKey) => void
  onSelect?: (card: Card) => void
  onAdd?: (card: Card) => void
  deckCounts?: ReadonlyMap<string, number>
  copyAllowance?: (card: Card) => CopyAllowance
}

/** Sortable columns. Each maps to an existing sort order, which has a fixed direction. */
const COLUMNS: {
  label: string
  sort?: SortKey
  direction?: 'ascending' | 'descending'
  /** Hidden on narrow screens. */
  optional?: boolean
}[] = [
  { label: 'Name', sort: 'name', direction: 'ascending' },
  { label: 'Cost', sort: 'cmc', direction: 'ascending' },
  { label: 'Type', optional: true },
  { label: 'Rarity', sort: 'rarity', direction: 'descending', optional: true },
  { label: 'Set', sort: 'number', direction: 'descending' }, // newest set first
  { label: 'Price', sort: 'price', direction: 'descending' },
]

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

/** The List density: one row per card with its key facts, sortable by column header. */
export function CardTable({
  cards,
  sort,
  onSort,
  onSelect,
  onAdd,
  deckCounts,
  copyAllowance,
}: Props) {
  // Virtualized (C3): only rows near the viewport are rendered, between spacer rows. Rows
  // vary in height (long type lines wrap), so each rendered row is measured.
  const body = useRef<HTMLTableSectionElement>(null)
  const top = useDocumentTop(body)
  // Its results are only read during this render, never passed to memoized children.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useWindowVirtualizer({
    count: cards.length,
    estimateSize: () => 48,
    overscan: 10,
    scrollMargin: top,
  })
  const rows = virtualizer.getVirtualItems()
  const spacerTop = rows.length ? rows[0].start - top : 0
  const spacerBottom = rows.length
    ? Math.max(0, virtualizer.getTotalSize() - (rows[rows.length - 1].end - top))
    : 0
  const columnCount = COLUMNS.length + (onAdd ? 1 : 0)

  if (cards.length === 0) {
    return <p className="empty">No cards match these filters.</p>
  }
  return (
    <div className="card-table-wrap">
      <table className="card-table" aria-rowcount={cards.length + 1}>
        <caption className="visually-hidden">Cards</caption>
        <thead>
          <tr aria-rowindex={1}>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={col.optional ? 'col-optional' : undefined}
                aria-sort={col.sort && col.sort === sort ? col.direction : undefined}
              >
                {col.sort ? (
                  <button type="button" onClick={() => onSort(col.sort!)}>
                    {col.label}
                    <span aria-hidden="true" className="sort-arrow">
                      {col.sort === sort ? (col.direction === 'ascending' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            {onAdd && (
              <th scope="col">
                <span className="visually-hidden">In deck and add</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody ref={body}>
          {spacerTop > 0 && (
            <tr className="spacer" aria-hidden="true">
              <td colSpan={columnCount} style={{ height: spacerTop }} />
            </tr>
          )}
          {rows.map(({ index }) => {
            const card = cards[index]
            const inDeck = deckCounts?.get(card.name) ?? 0
            const allowance = copyAllowance?.(card)
            return (
              <tr
                key={card.id}
                data-index={index}
                ref={virtualizer.measureElement}
                aria-rowindex={index + 2}
              >
                <th scope="row">
                  <button type="button" className="row-name" onClick={() => onSelect?.(card)}>
                    {card.name}
                  </button>
                </th>
                <td>
                  <ManaCost cost={card.manaCost} />
                </td>
                <td className="row-type col-optional">{card.typeLine}</td>
                <td className="col-optional">{capitalize(card.rarity)}</td>
                <td className="row-set">
                  <SetIcon code={card.set} name={card.setName} />{' '}
                  <span className="row-set-text">
                    {card.set.toUpperCase()} {card.collectorNumber}
                  </span>
                </td>
                <td className="row-price">{usd(card.prices.usd)}</td>
                {onAdd && (
                  <td className="row-add">
                    {inDeck > 0 && (
                      <span className="row-count" aria-label={`${inDeck} in deck`}>
                        ×{inDeck}
                      </span>
                    )}
                    <button
                      type="button"
                      className="row-add-button"
                      aria-label={`Add ${card.name} to deck`}
                      title={
                        allowance?.left === 0 ? limitReachedText(allowance) : 'Add to main deck'
                      }
                      disabled={allowance?.left === 0}
                      onClick={() => onAdd(card)}
                    >
                      <PlusIcon />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
          {spacerBottom > 0 && (
            <tr className="spacer" aria-hidden="true">
              <td colSpan={columnCount} style={{ height: spacerBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
