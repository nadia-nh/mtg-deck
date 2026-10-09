import { loadChoice, saveChoice } from './preference'

/**
 * How the card results are shown: large tiles, small tiles, or a table.
 * Remembered per browser; storage failures fall back to the default.
 */
export type Density = 'large' | 'small' | 'list'

export const DENSITY_KEY = 'mtg-deck:density'
export const DENSITIES: Density[] = ['large', 'small', 'list']

type KV = Pick<Storage, 'getItem' | 'setItem'>

export const loadDensity = (storage?: KV | null): Density =>
  loadChoice(DENSITY_KEY, DENSITIES, 'large', storage)

export const saveDensity = (density: Density, storage?: KV | null) =>
  saveChoice(DENSITY_KEY, density, storage)
