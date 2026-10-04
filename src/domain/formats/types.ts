import type { Deck, ResolveCard } from '../deck'

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
  validate(deck: Deck, resolve: ResolveCard): Issue[]
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === 'error')
