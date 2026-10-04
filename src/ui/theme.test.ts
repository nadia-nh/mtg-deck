import { describe, expect, test } from 'vitest'
import { THEME_KEY, applyTheme, loadThemePref, saveThemePref } from './theme'

const mem = () => {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('theme preference', () => {
  test('defaults to system and round-trips through storage', () => {
    const s = mem()
    expect(loadThemePref(s)).toBe('system')
    saveThemePref('dark', s)
    expect(loadThemePref(s)).toBe('dark')
  })

  test('ignores junk and survives blocked storage', () => {
    const s = mem()
    s.setItem(THEME_KEY, 'purple')
    expect(loadThemePref(s)).toBe('system')
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadThemePref(throwing)).toBe('system')
    expect(() => saveThemePref('light', throwing)).not.toThrow()
    expect(loadThemePref(null)).toBe('system')
  })

  test('applyTheme sets or clears data-theme', () => {
    const el = document.createElement('html')
    applyTheme('dark', el)
    expect(el.dataset.theme).toBe('dark')
    applyTheme('system', el)
    expect(el.hasAttribute('data-theme')).toBe(false)
  })
})
