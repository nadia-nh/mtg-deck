import type { Card } from '../card'
import { copiesByName, type Deck, type ResolveCard } from '../deck'

export type Severity = 'error' | 'warning'

export interface Issue {
  severity: Severity
  /** Stable machine-readable code, e.g. "too-many-copies". */
  code: string
  message: string
  cardName?: string
}

/**
 * A deck-building format. Add a new format by implementing this interface
 * (or reusing `constructedFormat`) and registering it in `registry.ts`.
 */
export interface FormatRules {
  id: string
  name: string
  description: string
  minMainDeck: number
  maxSideboard: number
  /** Most copies of this card (main + sideboard) a deck may hold; Infinity for basics. */
  copyLimit(card: Card): number
  validate(deck: Deck, resolve: ResolveCard): Issue[]
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === 'error')

/** How many more copies of `card` the deck may take before breaking the copy limit. */
export function copiesLeft(deck: Deck, format: FormatRules, card: Card): number {
  const have = copiesByName(deck).get(card.name) ?? 0
  return Math.max(0, format.copyLimit(card) - have)
}
