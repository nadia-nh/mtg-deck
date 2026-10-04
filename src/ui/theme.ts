/**
 * Theme preference: follow the OS ("system") or force light/dark.
 * Applied as <html data-theme="light|dark">; tokens.css switches
 * `color-scheme`, which drives every light-dark() color.
 */
export type ThemePref = 'system' | 'light' | 'dark'

export const THEME_KEY = 'mtg-deck:theme'
const PREFS: ThemePref[] = ['system', 'light', 'dark']

type KV = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): KV | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadThemePref(storage: KV | null = defaultStorage()): ThemePref {
  try {
    const v = storage?.getItem(THEME_KEY)
    return PREFS.includes(v as ThemePref) ? (v as ThemePref) : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePref(pref: ThemePref, storage: KV | null = defaultStorage()): void {
  try {
    storage?.setItem(THEME_KEY, pref)
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
}

export function applyTheme(pref: ThemePref, root: HTMLElement = document.documentElement): void {
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = pref
}
