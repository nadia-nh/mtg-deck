import { isBasicLand } from './card'
import type { Deck, ResolveCard } from './deck'

/**
 * The cards a player owns, counted by card *name* like decks are (any printing counts).
 * Pure: functions return a new record instead of mutating.
 */
export type Owned = Readonly<Record<string, number>>

export const MAX_OWNED = 99

/** Sets how many copies of a card are owned (0 removes it). */
export function setOwned(owned: Owned, name: string, n: number): Owned {
  const count = Math.min(MAX_OWNED, Math.max(0, Math.floor(n)))
  const next = { ...owned }
  if (count === 0) delete next[name]
  else next[name] = count
  return next
}

export interface MissingEntry {
  name: string
  /** Copies the deck uses, main deck and sideboard together. */
  need: number
  have: number
  missing: number
  /** Price per copy (USD snapshot), or null if unknown. */
  price: number | null
}

export interface Missing {
  entries: MissingEntry[]
  /** Total copies to acquire. */
  count: number
  /** Cost of the missing copies with a known price. */
  price: number
  /** Missing copies without a price. */
  unpriced: number
}

/**
 * What the deck needs that the collection doesn't have, most expensive first. Basic lands
 * are never missing: nobody tracks how many Mountains they own.
 */
export function missingCards(deck: Deck, owned: Owned, resolve: ResolveCard): Missing {
  const need = new Map<string, number>()
  for (const zone of ['main', 'side'] as const) {
    for (const [name, n] of Object.entries(deck[zone])) need.set(name, (need.get(name) ?? 0) + n)
  }

  const entries: MissingEntry[] = []
  for (const [name, n] of need) {
    const card = resolve(name)
    if (card && isBasicLand(card)) continue
    const have = owned[name] ?? 0
    if (have >= n) continue
    entries.push({ name, need: n, have, missing: n - have, price: card?.prices.usd ?? null })
  }
  entries.sort(
    (a, b) =>
      (b.price ?? -1) * b.missing - (a.price ?? -1) * a.missing || a.name.localeCompare(b.name),
  )

  let price = 0
  let unpriced = 0
  for (const e of entries) {
    if (e.price == null) unpriced += e.missing
    else price += e.price * e.missing
  }
  return {
    entries,
    count: entries.reduce((s, e) => s + e.missing, 0),
    price: Math.round(price * 100) / 100,
    unpriced,
  }
}
