import { describe, expect, test } from 'vitest'
import { DENSITY_KEY, loadDensity, saveDensity } from './density'

const mem = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('density preference', () => {
  test('defaults to large and round-trips through storage', () => {
    const s = mem()
    expect(loadDensity(s)).toBe('large')
    saveDensity('small', s)
    expect(loadDensity(s)).toBe('small')
  })

  test('ignores junk and survives blocked storage', () => {
    const s = mem()
    s.setItem(DENSITY_KEY, 'huge')
    expect(loadDensity(s)).toBe('large')
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadDensity(throwing)).toBe('large')
    expect(() => saveDensity('small', throwing)).not.toThrow()
    expect(loadDensity(null)).toBe('large')
  })
})
