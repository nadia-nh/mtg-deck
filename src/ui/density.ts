/**
 * How the card results are shown: large or small tiles.
 * Remembered per browser; storage failures fall back to the default.
 */
export type Density = 'large' | 'small'

export const DENSITY_KEY = 'mtg-deck:density'
export const DENSITIES: Density[] = ['large', 'small']
const DEFAULT: Density = 'large'

type KV = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): KV | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadDensity(storage: KV | null = defaultStorage()): Density {
  try {
    const v = storage?.getItem(DENSITY_KEY)
    return DENSITIES.includes(v as Density) ? (v as Density) : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function saveDensity(density: Density, storage: KV | null = defaultStorage()): void {
  try {
    storage?.setItem(DENSITY_KEY, density)
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
}
