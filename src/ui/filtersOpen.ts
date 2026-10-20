import { loadChoice, saveChoice } from './preference'

/**
 * Whether the filter column starts open. Narrow screens always start collapsed so cards are
 * visible first; wider screens remember the last choice (open by default), so someone who
 * folds the filters into the slim rail to get more columns keeps it that way.
 */
export const FILTERS_KEY = 'mtg-deck:filters'

type KV = Pick<Storage, 'getItem' | 'setItem'>

export const loadFiltersOpen = (narrow: boolean, storage?: KV | null): boolean =>
  !narrow && loadChoice(FILTERS_KEY, ['open', 'closed'] as const, 'open', storage) === 'open'

export const saveFiltersOpen = (open: boolean, storage?: KV | null) =>
  saveChoice(FILTERS_KEY, open ? 'open' : 'closed', storage)
