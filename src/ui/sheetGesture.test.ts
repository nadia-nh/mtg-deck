import { describe, expect, test } from 'vitest'
import { shouldCloseSheet } from './sheetGesture'

describe('shouldCloseSheet', () => {
  test.each([
    [150, 0.1, true], // dragged far
    [100, 0, true], // exactly the distance
    [60, 0.2, false], // a short, slow drag springs back
    [40, 0.8, true], // a quick flick
    [20, 2, false], // too small to be a flick (likely a tap)
    [-80, 1, false], // dragged up
    [0, 0, false],
  ])('dy %i at %f px/ms → %s', (dy, velocity, expected) => {
    expect(shouldCloseSheet(dy, velocity)).toBe(expected)
  })
})
