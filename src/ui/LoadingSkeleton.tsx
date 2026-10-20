import { useMediaQuery } from './useMediaQuery'

const TILES = 12

/**
 * Shown while the card data loads: grey shapes in the same layout as the browser (filters,
 * toolbar, card grid, deck panel), so the page doesn't jump when the cards arrive. Screen
 * readers hear "Loading cards…" once.
 */
export function LoadingSkeleton() {
  const narrow = useMediaQuery('(max-width: 1100px)')
  return (
    <div className="workspace loading-skeleton" role="status" aria-busy="true">
      <span className="visually-hidden">Loading cards…</span>
      <div className="browser" aria-hidden="true">
        <aside>
          <div className="panel skeleton-panel skeleton-filters">
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
          </div>
        </aside>
        <section>
          <span className="skeleton-line toolbar" />
          <ul className="card-grid" data-testid="skeleton-grid">
            {Array.from({ length: TILES }, (_, i) => (
              <li key={i} className="skeleton-card" />
            ))}
          </ul>
        </section>
      </div>
      {!narrow && (
        <div className="deck-panel skeleton-panel" aria-hidden="true">
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
          <span className="skeleton-line" />
        </div>
      )}
    </div>
  )
}
