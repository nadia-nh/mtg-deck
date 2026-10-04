import type { Card } from '../domain/card'
import type { SortKey } from '../domain/search'
import { limitReachedText, type CopyAllowance } from './deck/deckContext'
import { usd } from './format'
import { PlusIcon } from './icons'
import { ManaCost } from './mana/ManaCost'
import { SetIcon } from './SetIcon'

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
  { label: 'Set', sort: 'number', direction: 'ascending' },
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
  if (cards.length === 0) {
    return <p className="empty">No cards match these filters.</p>
  }
  return (
    <div className="card-table-wrap">
      <table className="card-table">
        <caption className="visually-hidden">Cards</caption>
        <thead>
          <tr>
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
        <tbody>
          {cards.map((card) => {
            const inDeck = deckCounts?.get(card.name) ?? 0
            const allowance = copyAllowance?.(card)
            return (
              <tr key={card.id}>
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
        </tbody>
      </table>
    </div>
  )
}
