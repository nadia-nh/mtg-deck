import { useMemo, useRef } from 'react'
import type { Card } from '../../domain/card'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import type { NameResolver } from '../../domain/decklist'
import { getFormat } from '../../domain/formats/registry'
import { DeckPanelBody } from './DeckPanel'
import { useDeck } from './deckContext'

interface Props {
  resolve: ResolveCard
  resolveForImport: NameResolver
  onSelect?: (card: Card) => void
}

/**
 * Narrow screens: a bar fixed to the bottom ("Boros Aggro · 42/60 · ✗") that opens the deck
 * panel as a sheet. The sheet is a modal <dialog>, so focus stays inside it and Esc closes it;
 * focus goes back to the bar afterwards.
 */
export function MobileDeck({ resolve, resolveForImport, onSelect }: Props) {
  const { active } = useDeck()
  const dialog = useRef<HTMLDialogElement>(null)
  const bar = useRef<HTMLButtonElement>(null)
  const format = getFormat(active.formatId)
  const main = zoneTotal(active, 'main')
  const side = zoneTotal(active, 'side')
  const errors = useMemo(
    () => format.validate(active, resolve).filter((i) => i.severity === 'error').length,
    [format, active, resolve],
  )
  const valid = errors === 0

  const close = () => dialog.current?.close()

  return (
    <>
      <button
        ref={bar}
        type="button"
        className="deck-bar"
        aria-haspopup="dialog"
        aria-label={`Open deck: ${active.name}, ${main} of ${format.minMainDeck} cards${
          side ? ` and ${side} in the sideboard` : ''
        }, ${valid ? `valid for ${format.name}` : `${errors} ${errors === 1 ? 'problem' : 'problems'}`}`}
        onClick={() => dialog.current?.showModal()}
      >
        <span className="deck-bar-name">{active.name}</span>
        <span className="deck-bar-count" data-testid="deck-bar-count">
          {main}/{format.minMainDeck}
        </span>
        <span className={`deck-bar-validity ${valid ? 'ok' : 'bad'}`} aria-hidden="true">
          {valid ? '✓' : '✗'}
        </span>
      </button>

      <dialog
        ref={dialog}
        className="deck-sheet"
        aria-labelledby="deck-sheet-title"
        onClose={() => bar.current?.focus()}
        onClick={(e) => e.target === e.currentTarget && close()} // tap on the backdrop
      >
        <div className="deck-panel">
          <header className="deck-sheet-header">
            <h2 id="deck-sheet-title">
              {active.name}{' '}
              <span className="muted" data-testid="deck-counts">
                {main} main · {side} side
              </span>
            </h2>
            <button type="button" className="close" aria-label="Close deck" onClick={close}>
              ×
            </button>
          </header>
          <DeckPanelBody
            resolve={resolve}
            resolveForImport={resolveForImport}
            onSelect={(card) => {
              close()
              onSelect?.(card)
            }}
          />
        </div>
      </dialog>
    </>
  )
}
