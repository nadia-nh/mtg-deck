import type { Card } from '../domain/card'

interface Props {
  cards: Card[]
  onSelect?: (card: Card) => void
  /** Adds one copy to the active deck. Shows a + button on each tile when set. */
  onAdd?: (card: Card) => void
  /** Copies of each card name already in the deck (main + side). */
  deckCounts?: ReadonlyMap<string, number>
}

export function CardGrid({ cards, onSelect, onAdd, deckCounts }: Props) {
  if (cards.length === 0) {
    return <p className="empty">No cards match these filters.</p>
  }
  return (
    <ul className="card-grid" aria-label="Cards">
      {cards.map((card) => {
        const inDeck = deckCounts?.get(card.name) ?? 0
        return (
          <li key={card.id} className="card-cell">
            <button
              type="button"
              className="card-tile"
              onClick={() => onSelect?.(card)}
              data-colors={card.colors.join('')}
              data-identity={card.colorIdentity.join('')}
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
                title="Add to main deck"
                onClick={() => onAdd(card)}
              >
                +
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
