import type { Card } from '../../domain/card'
import { groupEntries, zoneTotal, type ResolveCard, type Zone } from '../../domain/deck'
import { stackByManaValue } from '../../domain/stacks'
import { useMediaQuery } from '../useMediaQuery'
import { limitReachedText, useDeck } from './deckContext'

interface Props {
  resolve: ResolveCard
  onSelect?: (card: Card) => void
  onBrowse: () => void
}

/**
 * Full-width view of the active deck as card images, main deck then sideboard: stacked
 * columns by mana value where there is room, a plain image grid on phones.
 */
export function DeckView({ resolve, onSelect, onBrowse }: Props) {
  const { active } = useDeck()
  const wide = useMediaQuery('(min-width: 761px)')
  const main = zoneTotal(active, 'main')
  const side = zoneTotal(active, 'side')
  const ZoneLayout = wide ? ZoneStacks : ZoneImages

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
          <ZoneLayout
            zone="main"
            label={`Main deck (${main})`}
            resolve={resolve}
            onSelect={onSelect}
          />
          {side > 0 && (
            <ZoneLayout
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

interface ZoneProps {
  zone: Zone
  label: string
  resolve: ResolveCard
  onSelect?: (card: Card) => void
}

const copiesLabel = (n: number) => `${n} ${n === 1 ? 'copy' : 'copies'}`

/** Phones: a simple grid of images with counts. */
function ZoneImages({ zone, label, resolve, onSelect }: ZoneProps) {
  const { active } = useDeck()
  const entries = groupEntries(active, zone, resolve).flatMap((g) => g.entries)
  return (
    <>
      <h3>{label}</h3>
      <ul className="card-grid" data-density="small" aria-label={label}>
        {entries.map(({ name, count, card }) => (
          <li key={name} className="card-cell">
            <CardImage name={name} card={card} onSelect={onSelect} />
            <span className="tile-count" aria-label={copiesLabel(count)}>
              ×{count}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Wide screens: one column per mana value (then lands), cards overlapped to show titles. */
function ZoneStacks({ zone, label, resolve, onSelect }: ZoneProps) {
  const { active, addCard, removeCard, copyAllowance } = useDeck()
  const stacks = stackByManaValue(active, zone, resolve)
  return (
    <>
      <h3>{label}</h3>
      <div className="stacks">
        {stacks.map((stack) => {
          const title =
            stack.key === 'lands' || stack.key === 'unknown' ? stack.label : `MV ${stack.label}`
          return (
            <section
              key={stack.key}
              className="stack"
              aria-label={`${label}: ${title}, ${stack.total} ${stack.total === 1 ? 'card' : 'cards'}`}
              data-stack={stack.key}
            >
              <h4>
                {title} <span className="muted">({stack.total})</span>
              </h4>
              <ul>
                {stack.entries.map(({ name, count, card }) => {
                  const allowance = copyAllowance(name)
                  return (
                    <li key={name} className="stack-card">
                      <CardImage name={name} card={card} onSelect={onSelect} />
                      <span className="stack-count" aria-label={copiesLabel(count)}>
                        ×{count}
                      </span>
                      <span className="stack-actions">
                        <button
                          type="button"
                          aria-label={`Remove one ${name}`}
                          onClick={() => removeCard(zone, name)}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          aria-label={`Add one ${name}`}
                          title={allowance.left === 0 ? limitReachedText(allowance) : undefined}
                          disabled={allowance.left === 0}
                          onClick={() => addCard(zone, name)}
                        >
                          +
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}

function CardImage({
  name,
  card,
  onSelect,
}: {
  name: string
  card: Card | undefined
  onSelect?: (card: Card) => void
}) {
  if (!card?.images) return <span className="card-placeholder">{name}</span>
  return (
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
  )
}
