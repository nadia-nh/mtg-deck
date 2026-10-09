/**
 * Whether releasing a downward drag on a bottom sheet should close it: dragged far enough,
 * or flicked down quickly. `dy` is in pixels (down is positive), `velocity` in px/ms.
 */
export function shouldCloseSheet(dy: number, velocity: number, distance = 100): boolean {
  if (dy <= 0) return false
  return dy >= distance || (dy >= 30 && velocity >= 0.5)
}
