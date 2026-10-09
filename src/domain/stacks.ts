import {
  CURVE_BUCKETS,
  curveBucket,
  typeGroup,
  type Deck,
  type DeckEntry,
  type ResolveCard,
  type Zone,
} from './deck'

/** One column of the visual deck view. */
export interface Stack {
  key: string
  label: string
  entries: DeckEntry[]
  total: number
}

/**
 * Groups a zone into columns by mana value (0 … 7+, as on the mana curve), then lands,
 * then cards missing from the card data. Empty columns are left out. Within a column,
 * cards are sorted by name.
 */
export function stackByManaValue(deck: Deck, zone: Zone, resolve: ResolveCard): Stack[] {
  const byKey = new Map<string, DeckEntry[]>()
  for (const [name, count] of Object.entries(deck[zone])) {
    const card = resolve(name)
    const key = !card ? 'unknown' : typeGroup(card) === 'Land' ? 'lands' : curveBucket(card)
    byKey.set(key, [...(byKey.get(key) ?? []), { name, count, card }])
  }
  const order: [key: string, label: string][] = [
    ...CURVE_BUCKETS.map((b) => [b, b] as [string, string]),
    ['lands', 'Lands'],
    ['unknown', 'Not in card data'],
  ]
  return order
    .filter(([key]) => byKey.has(key))
    .map(([key, label]) => {
      const entries = byKey.get(key)!.sort((a, b) => a.name.localeCompare(b.name))
      return { key, label, entries, total: entries.reduce((s, e) => s + e.count, 0) }
    })
}
