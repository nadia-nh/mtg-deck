import { useMemo, useRef, type PointerEvent } from 'react'
import type { Card } from '../../domain/card'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import type { NameResolver } from '../../domain/decklist'
import { getFormat } from '../../domain/formats/registry'
import { shouldCloseSheet } from '../sheetGesture'
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
 * focus goes back to the bar afterwards. Dragging its header down closes it too.
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

  // Swipe down on the header to close. Only the header drags, so scrolling the list never
  // closes the sheet. The sheet follows the finger and springs back if released short.
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null)
  const setOffset = (dy: number, animate: boolean) => {
    const el = dialog.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.2s ease-out' : 'none'
    el.style.transform = dy > 0 ? `translateY(${dy}px)` : ''
  }
  const onDragStart = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return // let the close button click
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    setOffset(drag.current.dy, false)
  }
  const onDragEnd = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const velocity = d.dy / Math.max(1, e.timeStamp - d.t)
    if (shouldCloseSheet(d.dy, velocity)) {
      setOffset(0, false)
      close()
    } else {
      setOffset(0, true)
    }
  }

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
          <header
            className="deck-sheet-header"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <span className="sheet-handle" aria-hidden="true" />
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
