import type { Card, Color } from './card'
import {
  CURVE_BUCKETS,
  TYPE_GROUPS,
  curveBucket,
  typeGroup,
  type Deck,
  type DeckEntry,
  type ResolveCard,
  type Zone,
} from './deck'
import { COLORS } from './search'

/** One column of the visual deck view. */
export interface Stack {
  key: string
  label: string
  entries: DeckEntry[]
  total: number
}

export type StackBy = 'mv' | 'type' | 'color'
export const STACK_BY: StackBy[] = ['mv', 'type', 'color']

const COLOR_LABELS: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const TYPE_LABELS: Record<string, string> = {
  Creature: 'Creatures',
  Planeswalker: 'Planeswalkers',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Land: 'Lands',
  Other: 'Other',
}

/** Column order and labels, and which column a (known) card goes in, for each grouping. */
const GROUPINGS: Record<StackBy, { columns: [string, string][]; keyOf: (card: Card) => string }> = {
  // Mana value as on the mana curve; lands apart, since they have no meaningful mana value.
  mv: {
    columns: [...CURVE_BUCKETS.map((b): [string, string] => [b, `MV ${b}`]), ['lands', 'Lands']],
    keyOf: (card) => (typeGroup(card) === 'Land' ? 'lands' : curveBucket(card)),
  },
  type: {
    columns: TYPE_GROUPS.map((t): [string, string] => [t, TYPE_LABELS[t]]),
    keyOf: (card) => typeGroup(card),
  },
  // One color, or gold, or colorless; lands apart again (they'd all be "colorless").
  color: {
    columns: [
      ...COLORS.map((c): [string, string] => [c, COLOR_LABELS[c]]),
      ['multi', 'Multicolor'],
      ['colorless', 'Colorless'],
      ['lands', 'Lands'],
    ],
    keyOf: (card) =>
      typeGroup(card) === 'Land'
        ? 'lands'
        : card.colors.length > 1
          ? 'multi'
          : (card.colors[0] ?? 'colorless'),
  },
}

/**
 * Groups a zone into columns for the visual deck view, in a fixed order per grouping, with
 * cards missing from the card data last. Empty columns are left out; cards are sorted by
 * mana value, then name, within a column.
 */
export function stackDeck(deck: Deck, zone: Zone, resolve: ResolveCard, by: StackBy): Stack[] {
  const { columns, keyOf } = GROUPINGS[by]
  const byKey = new Map<string, DeckEntry[]>()
  for (const [name, count] of Object.entries(deck[zone])) {
    const card = resolve(name)
    const key = card ? keyOf(card) : 'unknown'
    byKey.set(key, [...(byKey.get(key) ?? []), { name, count, card }])
  }
  return [...columns, ['unknown', 'Not in card data'] as [string, string]]
    .filter(([key]) => byKey.has(key))
    .map(([key, label]) => {
      const entries = byKey
        .get(key)!
        .sort((a, b) => (a.card?.cmc ?? 0) - (b.card?.cmc ?? 0) || a.name.localeCompare(b.name))
      return { key, label, entries, total: entries.reduce((s, e) => s + e.count, 0) }
    })
}

/** Columns by mana value (the default grouping). */
export const stackByManaValue = (deck: Deck, zone: Zone, resolve: ResolveCard) =>
  stackDeck(deck, zone, resolve, 'mv')
