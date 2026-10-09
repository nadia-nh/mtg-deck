import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../../domain/card'
import { previewPosition } from '../previewPosition'

const SIZE = { width: 244, height: 340 } // half of Scryfall's 488×680 "normal" image

/** Only devices with a real hover (mouse, trackpad) get previews; touch taps open details. */
const canHover = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false

interface Shown {
  card: Card
  anchor: HTMLElement
  top: number
  left: number
}

/** Where the preview goes for this anchor, or null once the anchor is scrolled out of sight. */
function place(anchor: HTMLElement): { top: number; left: number } | null {
  if (!anchor.isConnected) return null
  const r = anchor.getBoundingClientRect()
  const container = anchor.closest('.deck-panel') ?? anchor
  const h = container.getBoundingClientRect()
  // Rows scrolled up under the pinned deck header count as out of sight too.
  const pinned = container.querySelector('.tabs-head')
  const visibleTop =
    pinned && getComputedStyle(pinned).position === 'sticky'
      ? pinned.getBoundingClientRect().bottom
      : h.top
  if (r.bottom < visibleTop || r.top > h.bottom) return null
  // Vertically next to the name; horizontally clear of the whole deck panel.
  return previewPosition({ top: r.top, left: h.left, width: h.width, height: r.height }, SIZE, {
    width: window.innerWidth,
    height: window.innerHeight,
  })
}

/**
 * A floating card image shown while a deck-list name is hovered or keyboard-focused.
 * It hides on mouse out, blur or Escape, and follows its name when the list scrolls (keyboard
 * focus scrolls rows into view), hiding once the name scrolls out of sight.
 */
export function useCardPreview(): {
  show: (card: Card, anchor: HTMLElement) => void
  hide: () => void
  preview: ReactNode
} {
  const [shown, setShown] = useState<Shown | null>(null)
  const hide = useCallback(() => setShown(null), [])

  const show = useCallback((card: Card, anchor: HTMLElement) => {
    if (!card.images || !canHover()) return
    const pos = place(anchor)
    setShown(pos && { card, anchor, ...pos })
  }, [])

  const anchor = shown?.anchor
  useEffect(() => {
    if (!anchor) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    const onScroll = () => {
      const pos = place(anchor)
      setShown((cur) => (cur && pos ? { ...cur, ...pos } : null))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [anchor, hide])

  const preview =
    shown &&
    createPortal(
      <div className="card-preview" style={{ top: shown.top, left: shown.left }}>
        <img
          src={shown.card.images!.normal}
          alt={shown.card.name}
          width={SIZE.width}
          height={SIZE.height}
        />
      </div>,
      document.body,
    )

  return { show, hide, preview }
}
