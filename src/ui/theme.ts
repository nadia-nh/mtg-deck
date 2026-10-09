import { loadChoice, saveChoice } from './preference'

/**
 * Theme preference: follow the OS ("system") or force light/dark.
 * Applied as <html data-theme="light|dark">; tokens.css switches
 * `color-scheme`, which drives every light-dark() color.
 */
export type ThemePref = 'system' | 'light' | 'dark'

export const THEME_KEY = 'mtg-deck:theme'
const PREFS: ThemePref[] = ['system', 'light', 'dark']

type KV = Pick<Storage, 'getItem' | 'setItem'>

export const loadThemePref = (storage?: KV | null): ThemePref =>
  loadChoice(THEME_KEY, PREFS, 'system', storage)

export const saveThemePref = (pref: ThemePref, storage?: KV | null) =>
  saveChoice(THEME_KEY, pref, storage)

export function applyTheme(pref: ThemePref, root: HTMLElement = document.documentElement): void {
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = pref
}
