import { useMemo } from 'react'
import { CURVE_BUCKETS, deckStats, type ResolveCard } from '../../domain/deck'
import { COLORS } from '../../domain/search'
import { useDeck } from './deckContext'

const COLOR_NAMES = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' } as const

export function DeckStats({ resolve }: { resolve: ResolveCard }) {
  const { active } = useDeck()
  const s = useMemo(() => deckStats(active, resolve), [active, resolve])
  const max = Math.max(1, ...Object.values(s.curve))
  const spells = s.mainCount - s.lands - s.unknownNames.length

  return (
    <section className="deck-stats" aria-label="Deck statistics">
      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{s.lands}</span>
          <span className="stat-label">lands</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Math.max(0, spells)}</span>
          <span className="stat-label">spells</span>
        </div>
        <div className="stat">
          <span className="stat-value">{s.averageCmc.toFixed(2)}</span>
          <span className="stat-label">avg mana value</span>
        </div>
        <div className="stat">
          <span className="stat-value" data-testid="deck-price">
            ${s.price.toFixed(2)}
          </span>
          <span className="stat-label">
            est. price{s.unpricedCount ? ` (${s.unpricedCount} unpriced)` : ''}
          </span>
        </div>
      </div>

      <figure className="curve">
        <figcaption>Mana curve (non-land cards)</figcaption>
        <div className="curve-plot" aria-hidden="true">
          {CURVE_BUCKETS.map((b) => {
            const n = s.curve[b]
            return (
              <div
                key={b}
                className="curve-col"
                title={`Mana value ${b}: ${n} ${n === 1 ? 'card' : 'cards'}`}
              >
                <div className="curve-track">
                  {n > 0 && <div className="curve-bar" style={{ height: `${(n / max) * 100}%` }} />}
                </div>
                <span className="curve-tick">{b}</span>
              </div>
            )
          })}
        </div>
        <table className="visually-hidden">
          <caption>Cards per mana value</caption>
          <tbody>
            {CURVE_BUCKETS.map((b) => (
              <tr key={b}>
                <th scope="row">{b}</th>
                <td>{s.curve[b]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>

      <div className="pip-counts" aria-label="Colored mana symbols">
        <span className="muted">Mana symbols:</span>
        {COLORS.filter((c) => s.pips[c] > 0).map((c) => (
          <span key={c} className="pip-count" title={`${COLOR_NAMES[c]} mana symbols`}>
            <i className={`ms ms-cost ms-${c.toLowerCase()}`} aria-hidden="true" />
            <span>
              {s.pips[c]} <span className="visually-hidden">{COLOR_NAMES[c]}</span>
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}
