import { useMemo } from 'react'
import { missingCards } from '../../domain/collection'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import { useCollection } from '../collection/collectionContext'
import { usd } from '../format'
import { useDeck } from './deckContext'

/** What the deck needs that the collection doesn't have, and roughly what it costs. */
export function MissingCards({ resolve }: { resolve: ResolveCard }) {
  const { active } = useDeck()
  const { owned } = useCollection()
  const missing = useMemo(() => missingCards(active, owned, resolve), [active, owned, resolve])
  if (zoneTotal(active, 'main') + zoneTotal(active, 'side') === 0) return null

  return (
    <section className="missing-cards" aria-labelledby="missing-cards-heading">
      <h4 id="missing-cards-heading">Missing from your collection</h4>
      {missing.count === 0 ? (
        <p className="ok">You own every card in this deck.</p>
      ) : (
        <>
          <p data-testid="missing-summary">
            {missing.count} {missing.count === 1 ? 'card' : 'cards'} · about {usd(missing.price)}
            {missing.unpriced > 0 && <span className="muted"> (+{missing.unpriced} unpriced)</span>}
          </p>
          {Object.keys(owned).length === 0 && (
            <p className="muted">Mark the cards you own from their details (“You own”).</p>
          )}
          <ul>
            {missing.entries.map((e) => (
              <li key={e.name}>
                <span className="missing-qty">{e.missing} ×</span>
                <span className="missing-name">{e.name}</span>
                <span className="muted missing-price">
                  {e.price == null ? '—' : usd(e.price * e.missing)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
