import { useRef } from 'react'
import type { Card } from '../domain/card'
import type { SetSection } from '../domain/search'
import { limitReachedText, type CopyAllowance } from './deck/deckContext'
import type { Density } from './density'
import { cards as cardsLabel } from './format'
import { PlusIcon } from './icons'
import { SetIcon } from './SetIcon'
import { useVirtualGrid } from './useVirtualGrid'

interface Props {
  cards: Card[]
  onSelect?: (card: Card) => void
  /** Adds one copy to the active deck. Shows a + button on each tile when set. */
  onAdd?: (card: Card) => void
  /** Copies of each card name already in the deck (main + side). */
  deckCounts?: ReadonlyMap<string, number>
  /** Copy limit per card; the + button is disabled once the deck holds the maximum. */
  copyAllowance?: (card: Card) => CopyAllowance
  density?: Exclude<Density, 'list'>
  /** Runs of cards per set; each gets a heading row (only with the set sort). */
  sections?: readonly SetSection[]
}

export function CardGrid({
  cards,
  onSelect,
  onAdd,
  deckCounts,
  copyAllowance,
  density = 'large',
  sections,
}: Props) {
  const ref = useRef<HTMLUListElement>(null)
  // Only the rows near the viewport are in the DOM; padding stands in for the rest.
  const { rows, paddingTop, paddingBottom } = useVirtualGrid(ref, cards.length, sections)

  if (cards.length === 0) {
    return <p className="empty">No cards match these filters.</p>
  }
  return (
    <ul
      ref={ref}
      className="card-grid"
      data-density={density}
      aria-label="Cards"
      style={{ paddingTop, paddingBottom }}
    >
      {/* One flat list of keyed items: nested per-row arrays would key tiles only within
          their row, so every tile (and keyboard focus) would remount as the window scrolls. */}
      {rows.flatMap((row) => {
        if (row.header) {
          const { set, setName, start, count } = row.header
          const year = cards[start]?.releasedAt.slice(0, 4)
          return [
            <li key={`set:${set}`} className="set-divider">
              <h3>
                <SetIcon code={set} name={setName} decorative />
                {setName}
                <span className="set-divider-meta">
                  {year} · {cardsLabel(count)}
                </span>
              </h3>
            </li>,
          ]
        }
        return cards.slice(row.start, row.end).map((card, i) => cardCell(card, row.start + i))
      })}
    </ul>
  )

  function cardCell(card: Card, index: number) {
    const inDeck = deckCounts?.get(card.name) ?? 0
    const allowance = copyAllowance?.(card)
    return (
      <li key={card.id} className="card-cell" aria-setsize={cards.length} aria-posinset={index + 1}>
        <button
          type="button"
          className="card-tile"
          onClick={() => onSelect?.(card)}
          data-colors={card.colors.join('')}
          data-identity={card.colorIdentity.join('')}
          data-set={card.set}
        >
          {card.images ? (
            <img
              src={card.images.normal}
              alt={card.name}
              loading="lazy"
              decoding="async"
              width={488}
              height={680}
            />
          ) : (
            <span className="card-placeholder">{card.name}</span>
          )}
        </button>
        {inDeck > 0 && (
          <span className="tile-count" aria-label={`${inDeck} in deck`}>
            ×{inDeck}
          </span>
        )}
        {onAdd && (
          <button
            type="button"
            className="tile-add"
            aria-label={`Add ${card.name} to deck`}
            title={allowance?.left === 0 ? limitReachedText(allowance) : 'Add to main deck'}
            disabled={allowance?.left === 0}
            onClick={() => onAdd(card)}
          >
            <PlusIcon />
          </button>
        )}
      </li>
    )
  }
}
