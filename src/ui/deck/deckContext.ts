import { createContext, useContext } from 'react'
import type { Deck, Zone } from '../../domain/deck'

export interface DeckActions {
  decks: Deck[]
  active: Deck
  /** False when the browser refused the last save (blocked or full storage). */
  storageOk: boolean
  select(id: string): void
  create(name?: string, formatId?: string): Deck
  deleteDeck(id: string): void
  duplicate(id: string): void
  rename(name: string): void
  setFormat(formatId: string): void
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
