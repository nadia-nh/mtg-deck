import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

const CARD_RATIO = 680 / 488 // card images are 488×680

interface GridLayout {
  cols: number
  rowHeight: number
  /** The grid's distance from the top of the document (the virtualizer's scroll margin). */
  top: number
}

/** Reads the CSS grid's resolved columns and gap, so the CSS stays the single source of truth. */
function measure(el: HTMLElement): GridLayout {
  const style = getComputedStyle(el)
  const tracks = style.gridTemplateColumns.split(' ').filter((t) => t.endsWith('px'))
  const cols = Math.max(1, tracks.length)
  const tileWidth = parseFloat(tracks[0] ?? '') || el.clientWidth
  const gap = parseFloat(style.rowGap) || 0
  return {
    cols,
    // Without layout (e.g. jsdom) fall back to a typical tile so something still renders.
    rowHeight: tileWidth > 0 ? tileWidth * CARD_RATIO + gap : 300,
    top: el.getBoundingClientRect().top + window.scrollY,
  }
}

/**
 * Window-scrolled virtualization for the card grid (C3). Only rows near the viewport are
 * rendered; the rest are stood in for by padding on the grid itself, so the <ul> keeps only
 * <li> children (no wrapper elements) and the CSS grid lays out the visible slice as usual.
 */
export function useVirtualGrid(ref: RefObject<HTMLElement | null>, count: number) {
  const [layout, setLayout] = useState<GridLayout>({ cols: 1, rowHeight: 300, top: 0 })
  // Only re-render when the layout really changed.
  const update = (el: HTMLElement) => {
    const next = measure(el)
    setLayout((cur) =>
      cur.cols === next.cols &&
      Math.abs(cur.rowHeight - next.rowHeight) < 0.5 &&
      Math.abs(cur.top - next.top) < 0.5
        ? cur
        : next,
    )
  }

  // Re-measure after every render (the toolbar above can wrap and move the grid) and on resize.
  useLayoutEffect(() => {
    if (ref.current) update(ref.current)
  })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => update(el))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  const rows = Math.ceil(count / layout.cols)
  // Its results are only read during this render, never passed to memoized children.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => layout.rowHeight,
    overscan: 3,
    scrollMargin: layout.top,
  })
  // Cached row sizes are stale once the tile size changes (resize, density).
  useEffect(() => virtualizer.measure(), [virtualizer, layout.rowHeight, layout.cols])

  const items = virtualizer.getVirtualItems()
  const first = items[0]
  const last = items.at(-1)
  const total = virtualizer.getTotalSize()
  return {
    start: first ? first.index * layout.cols : 0,
    end: last ? Math.min(count, (last.index + 1) * layout.cols) : 0,
    paddingTop: first ? first.start - layout.top : 0,
    paddingBottom: last ? Math.max(0, total - (last.end - layout.top)) : 0,
  }
}
