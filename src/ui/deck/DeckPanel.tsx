import { useState } from 'react'
import type { Card } from '../../domain/card'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import { BasicLandButtons } from './BasicLandButtons'
import { DeckList } from './DeckList'
import { DeckManager } from './DeckManager'
import { DeckStats } from './DeckStats'
import { DeckValidation } from './DeckValidation'
import { ImportExport } from './ImportExport'
import type { NameResolver } from '../../domain/decklist'
import { useDeck } from './deckContext'
import { Tabs } from '../Tabs'

interface Props {
  resolve: ResolveCard
  resolveForImport: NameResolver
  onSelect?: (card: Card) => void
}

/** Desktop: the deck panel beside the browser, collapsible like the filters. */
export function DeckPanel({ resolve, resolveForImport, onSelect }: Props) {
  const { active } = useDeck()
  const [open, setOpen] = useState(true)
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
      <DeckPanelBody resolve={resolve} resolveForImport={resolveForImport} onSelect={onSelect} />
    </details>
  )
}

/** The deck controls, validity and tabs; shared by the desktop panel and the phone sheet. */
export function DeckPanelBody({ resolve, resolveForImport, onSelect }: Props) {
  const { active, storageOk } = useDeck()
  const main = zoneTotal(active, 'main')
  const side = zoneTotal(active, 'side')

  return (
    <Tabs
      label="Deck sections"
      className="deck-tabs"
      header={
        // Pinned with the tab list on desktop, so the deck, format and validity stay in view.
        <>
          {!storageOk && (
            <p role="alert" className="storage-warning">
              Your browser didn’t allow saving. Changes will be lost when you close this tab.
            </p>
          )}
          <DeckManager />
          <DeckValidation resolve={resolve} />
        </>
      }
      tabs={[
        {
          id: 'cards',
          label: 'Cards',
          content: (
            <>
              <h3>Main deck ({main})</h3>
              <BasicLandButtons resolve={resolve} />
              <DeckList zone="main" resolve={resolve} onSelect={onSelect} />
              <h3>Sideboard ({side})</h3>
              <DeckList zone="side" resolve={resolve} onSelect={onSelect} />
            </>
          ),
        },
        { id: 'stats', label: 'Stats', content: <DeckStats resolve={resolve} /> },
        {
          id: 'io',
          label: 'Import / export',
          content: <ImportExport resolve={resolve} resolveForImport={resolveForImport} />,
        },
      ]}
    />
  )
}
