import type { Card } from '../card'
import { copiesByName, zoneTotal, type Deck, type ResolveCard } from '../deck'

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

export type DeckStatus = 'empty' | 'incomplete' | 'valid' | 'invalid'

/** The error a deck has while it's still being built: fewer main-deck cards than needed. */
export const IN_PROGRESS_CODE = 'main-too-small'

/**
 * A deck with no cards is "empty", and one whose only error is having too few cards is
 * "incomplete": neither is wrong, the user just isn't done, so the UI shows progress instead
 * of an error. "invalid" is kept for real rule breaks (copies, legality, sideboard size).
 */
export function deckStatus(deck: Deck, issues: Issue[]): DeckStatus {
  if (zoneTotal(deck, 'main') + zoneTotal(deck, 'side') === 0) return 'empty'
  const errors = issues.filter((i) => i.severity === 'error')
  if (errors.length === 0) return 'valid'
  return errors.every((i) => i.code === IN_PROGRESS_CODE) ? 'incomplete' : 'invalid'
}

/** How many more copies of `card` the deck may take before breaking the copy limit. */
export function copiesLeft(deck: Deck, format: FormatRules, card: Card): number {
  const have = copiesByName(deck).get(card.name) ?? 0
  return Math.max(0, format.copyLimit(card) - have)
}
