import type { Card } from '../domain/card'
import { limitReachedText, type CopyAllowance } from './deck/deckContext'
import type { Density } from './density'
import { PlusIcon } from './icons'

interface Props {
  cards: Card[]
  onSelect?: (card: Card) => void
  /** Adds one copy to the active deck. Shows a + button on each tile when set. */
  onAdd?: (card: Card) => void
  /** Copies of each card name already in the deck (main + side). */
  deckCounts?: ReadonlyMap<string, number>
  /** Copy limit per card; the + button is disabled once the deck holds the maximum. */
  copyAllowance?: (card: Card) => CopyAllowance
  density?: Density
}

export function CardGrid({
  cards,
  onSelect,
  onAdd,
  deckCounts,
  copyAllowance,
  density = 'large',
}: Props) {
  if (cards.length === 0) {
    return <p className="empty">No cards match these filters.</p>
  }
  return (
    <ul className="card-grid" data-density={density} aria-label="Cards">
      {cards.map((card) => {
        const inDeck = deckCounts?.get(card.name) ?? 0
        const allowance = copyAllowance?.(card)
        return (
          <li key={card.id} className="card-cell">
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
      })}
    </ul>
  )
}
