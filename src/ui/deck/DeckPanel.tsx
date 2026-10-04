import { useState } from 'react'
import type { Card } from '../../domain/card'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import { BasicLandButtons } from './BasicLandButtons'
import { DeckList } from './DeckList'
import { useDeck } from './deckContext'

interface Props {
  resolve: ResolveCard
  onSelect?: (card: Card) => void
}

export function DeckPanel({ resolve, onSelect }: Props) {
  const { active, storageOk } = useDeck()
  // Collapsed by default on narrow screens, like the filters.
  const [open, setOpen] = useState(() => !window.matchMedia?.('(max-width: 1100px)').matches)
  const main = zoneTotal(active, 'main')
  const side = zoneTotal(active, 'side')

  return (
    <details className="deck-panel" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="deck-title">{active.name}</span>{' '}
        <span className="muted" data-testid="deck-counts">
          {main} main · {side} side
        </span>
      </summary>

      {!storageOk && (
        <p role="alert" className="warning">
          Your browser didn’t allow saving. Changes will be lost when you close this tab.
        </p>
      )}

      <h3>Main deck ({main})</h3>
      <BasicLandButtons resolve={resolve} />
      <DeckList zone="main" resolve={resolve} onSelect={onSelect} />
      <h3>Sideboard ({side})</h3>
      <DeckList zone="side" resolve={resolve} onSelect={onSelect} />
    </details>
  )
}
