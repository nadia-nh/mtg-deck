import { describe, expect, test } from 'vitest'
import { FILTERS_KEY, loadFiltersOpen, saveFiltersOpen } from './filtersOpen'

const mem = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('filters open preference', () => {
  test('wide screens default to open and remember the last choice', () => {
    const s = mem()
    expect(loadFiltersOpen(false, s)).toBe(true)
    saveFiltersOpen(false, s)
    expect(loadFiltersOpen(false, s)).toBe(false)
    saveFiltersOpen(true, s)
    expect(loadFiltersOpen(false, s)).toBe(true)
  })

  test('narrow screens always start collapsed', () => {
    const s = mem()
    saveFiltersOpen(true, s)
    expect(loadFiltersOpen(true, s)).toBe(false)
  })

  test('ignores junk and survives blocked storage', () => {
    const s = mem()
    s.setItem(FILTERS_KEY, 'sideways')
    expect(loadFiltersOpen(false, s)).toBe(true)
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadFiltersOpen(false, throwing)).toBe(true)
    expect(() => saveFiltersOpen(false, throwing)).not.toThrow()
  })
})
