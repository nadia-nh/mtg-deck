import type { Card } from '../domain/card'

interface Props {
  cards: Card[]
  onSelect?: (card: Card) => void
}

export function CardGrid({ cards, onSelect }: Props) {
  if (cards.length === 0) {
    return <p className="empty">No cards match these filters.</p>
  }
  return (
    <ul className="card-grid" aria-label="Cards">
      {cards.map((card) => (
        <li key={card.id}>
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
        </li>
      ))}
    </ul>
  )
}
