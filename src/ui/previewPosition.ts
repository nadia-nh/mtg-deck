export interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Where to put a floating card preview next to the element it describes: to the left of
 * the anchor (the deck panel sits on the right), else to the right, else over the anchor's
 * column. Vertically centred on the anchor and kept inside the viewport.
 */
export function previewPosition(
  anchor: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 12,
): { top: number; left: number } {
  const margin = 8
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))

  const top = clamp(
    anchor.top + anchor.height / 2 - size.height / 2,
    margin,
    viewport.height - size.height - margin,
  )

  const leftSide = anchor.left - gap - size.width
  const rightSide = anchor.left + anchor.width + gap
  let left: number
  if (leftSide >= margin) left = leftSide
  else if (rightSide + size.width <= viewport.width - margin) left = rightSide
  else left = clamp(anchor.left, margin, viewport.width - size.width - margin)

  return { top, left }
}
