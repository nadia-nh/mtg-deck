import type { Card } from '../../domain/card'
import { groupEntries, zoneTotal, type ResolveCard, type Zone } from '../../domain/deck'
import { useDeck } from './deckContext'

interface Props {
  resolve: ResolveCard
  onSelect?: (card: Card) => void
  onBrowse: () => void
}

/** Full-width view of the active deck as card images, main deck then sideboard. */
export function DeckView({ resolve, onSelect, onBrowse }: Props) {
  const { active } = useDeck()
  const main = zoneTotal(active, 'main')
  const side = zoneTotal(active, 'side')

  return (
    <section className="deck-view" aria-labelledby="deck-view-heading">
      <h2 id="deck-view-heading">
        {active.name}{' '}
        <span className="muted">
          {main} main · {side} side
        </span>
      </h2>
      {main + side === 0 ? (
        <p className="empty">
          This deck is empty.{' '}
          <button type="button" className="link-button" onClick={onBrowse}>
            Browse cards
          </button>{' '}
          to add some.
        </p>
      ) : (
        <>
          <ZoneImages
            zone="main"
            label={`Main deck (${main})`}
            resolve={resolve}
            onSelect={onSelect}
          />
          {side > 0 && (
            <ZoneImages
              zone="side"
              label={`Sideboard (${side})`}
              resolve={resolve}
              onSelect={onSelect}
            />
          )}
        </>
      )}
    </section>
  )
}

function ZoneImages({
  zone,
  label,
  resolve,
  onSelect,
}: {
  zone: Zone
  label: string
  resolve: ResolveCard
  onSelect?: (card: Card) => void
}) {
  const { active } = useDeck()
  const entries = groupEntries(active, zone, resolve).flatMap((g) => g.entries)
  return (
    <>
      <h3>{label}</h3>
      <ul className="card-grid" data-density="small" aria-label={label}>
        {entries.map(({ name, count, card }) => (
          <li key={name} className="card-cell">
            {card?.images ? (
              <button type="button" className="card-tile" onClick={() => onSelect?.(card)}>
                <img
                  src={card.images.normal}
                  alt={name}
                  loading="lazy"
                  decoding="async"
                  width={488}
                  height={680}
                />
              </button>
            ) : (
              <span className="card-placeholder">{name}</span>
            )}
            <span className="tile-count" aria-label={`${count} ${count === 1 ? 'copy' : 'copies'}`}>
              ×{count}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
