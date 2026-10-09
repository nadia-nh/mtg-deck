import { createContext, useContext } from 'react'
import type { Deck, Zone } from '../../domain/deck'
import type { Change } from '../../domain/history'

export interface CopyAllowance {
  limit: number
  left: number
  formatName: string
}

/** Explains a disabled add button, e.g. "Pioneer allows 4 copies; the deck has them all." */
export const limitReachedText = ({ limit, formatName }: CopyAllowance) =>
  `${formatName} allows ${limit === 1 ? '1 copy' : `${limit} copies`}; the deck has them all.`

export interface DeckActions {
  decks: Deck[]
  active: Deck
  /** False when the browser refused the last save (blocked or full storage). */
  storageOk: boolean
  /** The newest undoable change, for the toast; null once undone or dismissed. */
  lastChange: Change | null
  /** Reverts the newest recorded change: card edits, imports and deck deletes. */
  undo(): void
  /** Hides the toast without undoing. */
  dismissChange(): void
  select(id: string): void
  create(
    name?: string,
    formatId?: string,
    cards?: { main: Record<string, number>; side: Record<string, number> },
  ): Deck
  deleteDeck(id: string): void
  duplicate(id: string): void
  rename(name: string): void
  setFormat(formatId: string): void
  /**
   * The active format's copy limit for a card name (main + sideboard) and how many more
   * copies fit. Unknown cards can't be checked, so they report Infinity.
   */
  copyAllowance(name: string): CopyAllowance
  /** Adds up to `n` copies, stopping at the format's copy limit. */
  addCard(zone: Zone, name: string, n?: number): void
  removeCard(zone: Zone, name: string, n?: number): void
  setCount(zone: Zone, name: string, qty: number): void
  moveCard(from: Zone, to: Zone, name: string, n?: number): void
  /** Replace the active deck's cards (used by import). */
  replaceCards(main: Record<string, number>, side: Record<string, number>): void
}

export const DeckContext = createContext<DeckActions | null>(null)

export function useDeck(): DeckActions {
  const ctx = useContext(DeckContext)
  if (!ctx) throw new Error('useDeck must be used inside <DeckProvider>')
  return ctx
}
