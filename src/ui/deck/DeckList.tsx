import type { Card } from '../../domain/card'
import { groupEntries, type ResolveCard, type Zone } from '../../domain/deck'
import { ManaCost } from '../mana/ManaCost'
import { limitReachedText, useDeck } from './deckContext'
import { useCardPreview } from './useCardPreview'

const GROUP_LABEL: Record<string, string> = {
  Creature: 'Creatures',
  Planeswalker: 'Planeswalkers',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Land: 'Lands',
  Other: 'Other',
  Unknown: 'Not in card data',
}

interface Props {
  zone: Zone
  resolve: ResolveCard
  onSelect?: (card: Card) => void
}

export function DeckList({ zone, resolve, onSelect }: Props) {
  const { active, addCard, removeCard, moveCard, copyAllowance } = useDeck()
  const groups = groupEntries(active, zone, resolve)
  const other: Zone = zone === 'main' ? 'side' : 'main'
  const { show, hide, preview } = useCardPreview()

  if (groups.length === 0) {
    return (
      <p className="muted deck-empty">
        {zone === 'main' ? 'No cards yet. Use the + on a card to add it.' : 'Sideboard is empty.'}
      </p>
    )
  }

  return (
    <div className="deck-list">
      {groups.map(({ group, entries, total }) => (
        <section key={group} aria-label={`${GROUP_LABEL[group]} (${total})`}>
          <h4>
            {GROUP_LABEL[group]} <span className="muted">({total})</span>
          </h4>
          <ul>
            {entries.map(({ name, count, card }) => {
              const allowance = copyAllowance(name)
              return (
                <li key={name} className="deck-row" data-card={name}>
                  <span className="qty-controls">
                    <button
                      type="button"
                      aria-label={`Remove one ${name}`}
                      onClick={() => removeCard(zone, name)}
                    >
                      −
                    </button>
                    <span className="qty" aria-label={`${count} copies`}>
                      {count}
                    </span>
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
                  {card ? (
                    <button
                      type="button"
                      className="deck-card-name"
                      onMouseEnter={(e) => show(card, e.currentTarget)}
                      onMouseLeave={hide}
                      // Keyboard focus only: a mouse click (or returning from the dialog) shouldn't pop it up.
                      onFocus={(e) =>
                        e.currentTarget.matches(':focus-visible') && show(card, e.currentTarget)
                      }
                      onBlur={hide}
                      onClick={() => {
                        hide()
                        onSelect?.(card)
                      }}
                    >
                      {name}
                    </button>
                  ) : (
                    <span className="deck-card-name unknown">{name}</span>
                  )}
                  <span className="mana">{card && <ManaCost cost={card.manaCost} />}</span>
                  <button
                    type="button"
                    className="move"
                    title={zone === 'main' ? 'Move one to sideboard' : 'Move one to main deck'}
                    aria-label={`Move one ${name} to ${other === 'side' ? 'sideboard' : 'main deck'}`}
                    onClick={() => moveCard(zone, other, name)}
                  >
                    {zone === 'main' ? '→SB' : '→MD'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {preview}
    </div>
  )
}
