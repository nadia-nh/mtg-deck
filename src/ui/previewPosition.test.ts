import { describe, expect, test } from 'vitest'
import { previewPosition } from './previewPosition'

const size = { width: 240, height: 334 }
const viewport = { width: 1440, height: 900 }

describe('previewPosition', () => {
  test('sits to the left of the anchor, vertically centred on it', () => {
    const anchor = { top: 400, left: 1100, width: 150, height: 20 }
    expect(previewPosition(anchor, size, viewport)).toEqual({
      top: 400 + 10 - 167,
      left: 1100 - 12 - 240,
    })
  })

  test('flips to the right when there is no room on the left', () => {
    const anchor = { top: 400, left: 100, width: 150, height: 20 }
    expect(previewPosition(anchor, size, viewport).left).toBe(100 + 150 + 12)
  })

  test('falls back to the anchor column when neither side fits', () => {
    const narrow = { width: 390, height: 844 }
    const anchor = { top: 400, left: 60, width: 250, height: 20 }
    const { left } = previewPosition(anchor, size, narrow)
    expect(left).toBeGreaterThanOrEqual(8)
    expect(left + size.width).toBeLessThanOrEqual(390 - 8)
  })

  test('stays inside the viewport near the top and bottom edges', () => {
    const nearTop = { top: 5, left: 1100, width: 150, height: 20 }
    expect(previewPosition(nearTop, size, viewport).top).toBe(8)
    const nearBottom = { top: 890, left: 1100, width: 150, height: 20 }
    expect(previewPosition(nearBottom, size, viewport).top).toBe(900 - 334 - 8)
  })
})
