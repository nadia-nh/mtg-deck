import { describe, expect, test } from 'vitest'
import { loadChoice, saveChoice } from './preference'

const mem = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}
const OPTIONS = ['mv', 'type', 'color'] as const

describe('remembered choice', () => {
  test('defaults, then round-trips through storage', () => {
    const s = mem()
    expect(loadChoice('k', OPTIONS, 'mv', s)).toBe('mv')
    saveChoice('k', 'color', s)
    expect(loadChoice('k', OPTIONS, 'mv', s)).toBe('color')
  })

  test('ignores values that are not allowed and survives blocked storage', () => {
    const s = mem()
    s.setItem('k', 'rainbow')
    expect(loadChoice('k', OPTIONS, 'mv', s)).toBe('mv')
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadChoice('k', OPTIONS, 'type', throwing)).toBe('type')
    expect(() => saveChoice('k', 'mv', throwing)).not.toThrow()
    expect(loadChoice('k', OPTIONS, 'mv', null)).toBe('mv')
  })
})
