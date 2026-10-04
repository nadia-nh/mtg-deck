import { constructedFormat } from './constructed'
import type { FormatRules } from './types'

/** Every format the app knows. Order is the order shown in the UI. */
export const FORMATS: FormatRules[] = [
  constructedFormat({
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Cards from Return to Theros (2012) onward.',
    legalityKey: 'pioneer',
  }),
  constructedFormat({
    id: 'standard',
    name: 'Standard',
    description: 'The most recent sets in rotation.',
    legalityKey: 'standard',
  }),
  constructedFormat({
    id: 'modern',
    name: 'Modern',
    description: 'Cards from Eighth Edition (2003) onward.',
    legalityKey: 'modern',
  }),
  constructedFormat({
    id: 'legacy',
    name: 'Legacy',
    description: 'All sets, with a ban list.',
    legalityKey: 'legacy',
  }),
  constructedFormat({
    id: 'vintage',
    name: 'Vintage',
    description: 'All sets; some cards restricted to one copy.',
    legalityKey: 'vintage',
  }),
  constructedFormat({
    id: 'pauper',
    name: 'Pauper',
    description: 'Commons only.',
    legalityKey: 'pauper',
  }),
  constructedFormat({
    id: 'casual',
    name: 'Casual (60-card)',
    description: 'Deck size and 4-copy rules only; any card allowed.',
  }),
]

export const DEFAULT_FORMAT_ID = 'pioneer'

export function getFormat(id: string): FormatRules {
  return FORMATS.find((f) => f.id === id) ?? FORMATS.find((f) => f.id === 'casual')!
}
