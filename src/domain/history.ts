import type { Deck, Zone } from './deck'

/**
 * One undoable deck change: snapshots of the affected deck before and after.
 * - before = null: the deck was created (undo removes it)
 * - after = null: the deck was deleted (undo restores it)
 * - both set: the deck's cards changed (undo restores the cards)
 */
export interface Change {
  id: number
  message: string
  before: Deck | null
  after: Deck | null
  /** The active deck before the change, so undo can switch back to it. */
  activeBefore: string | null
  /** A deck created as a side effect (the blank deck after deleting the last one). */
  alsoCreated?: string
}

export const HISTORY_LIMIT = 20

/** Adds a change, keeping only the most recent `limit`. Newest last. */
export function pushChange(history: Change[], change: Change, limit = HISTORY_LIMIT): Change[] {
  return [...history, change].slice(-limit)
}

/** Takes the newest change off the stack. */
export function popChange(history: Change[]): [Change | undefined, Change[]] {
  return history.length ? [history[history.length - 1], history.slice(0, -1)] : [undefined, history]
}

/**
 * What undoing a card change saves: the current deck with the earlier cards. Keeps any
 * name or format change made since, since those aren't undoable.
 */
export function restoreCards(current: Deck, before: Deck): Deck {
  return { ...current, main: { ...before.main }, side: { ...before.side } }
}

/* ---- Toast messages ---- */

const copies = (name: string, n: number) => (n === 1 ? name : `${n} × ${name}`)
const zoneName = (zone: Zone) => (zone === 'main' ? 'main deck' : 'sideboard')

export const addedMessage = (name: string, n: number, zone: Zone) =>
  `Added ${copies(name, n)}${zone === 'side' ? ' to sideboard' : ''}`
export const removedMessage = (name: string, n: number, zone: Zone) =>
  `Removed ${copies(name, n)}${zone === 'side' ? ' from sideboard' : ''}`
export const movedMessage = (name: string, n: number, to: Zone) =>
  `Moved ${copies(name, n)} to ${zoneName(to)}`
