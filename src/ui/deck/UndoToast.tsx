import { useEffect, useRef, useState } from 'react'
import { useDeck } from './deckContext'

const SHOW_MS = 6000

/** Typing in a field keeps the browser's own undo. */
const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * "Added Lava Coil · Undo". Closes itself after a few seconds, but not while hovered or
 * focused (so there is always time to reach Undo). Ctrl/Cmd+Z undoes too, step by step.
 */
export function UndoToast() {
  const { lastChange, undo, dismissChange } = useDeck()
  const [paused, setPaused] = useState(false)
  // Latest callbacks, so the timer and key listener don't restart on every render.
  const actions = useRef({ undo, dismissChange })
  useEffect(() => {
    actions.current = { undo, dismissChange }
  })

  const changeId = lastChange?.id
  useEffect(() => {
    if (changeId == null || paused) return
    const timer = setTimeout(() => actions.current.dismissChange(), SHOW_MS)
    return () => clearTimeout(timer)
  }, [changeId, paused])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'z' || !(e.ctrlKey || e.metaKey) || e.shiftKey) return
      if (isTextField(e.target)) return
      e.preventDefault()
      actions.current.undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="toast-region">
      {/* Always present, so screen readers announce each new message. */}
      <p role="status" className="visually-hidden">
        {lastChange?.message}
      </p>
      {lastChange && (
        <div
          className="toast"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <span aria-hidden="true">{lastChange.message}</span>
          <button
            type="button"
            className="toast-undo"
            aria-label={`Undo: ${lastChange.message}`}
            onClick={undo}
          >
            Undo
          </button>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss"
            onClick={dismissChange}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
