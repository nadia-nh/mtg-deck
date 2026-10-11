import { isLand, type Card, type Color } from './card'
import { COLORS } from './search'

/**
 * A deck is just counts keyed by card *name*. Constructed rules count copies
 * by name across printings, and names survive data refreshes and new sets.
 * All functions are pure: they return a new Deck instead of mutating.
 */
export type Zone = 'main' | 'side'

export interface Deck {
  id: string
  name: string
  formatId: string
  main: Record<string, number>
  side: Record<string, number>
  createdAt: string
  updatedAt: string
  /**
   * True once the user has typed a name. Until then the app names the deck itself and
   * renames it from its colors as cards are added (see deckNames.ts). Missing on decks
   * saved before this existed.
   */
  nameEdited?: boolean
}

export type ResolveCard = (name: string) => Card | undefined

export function createDeck(
  name: string,
  formatId: string,
  opts: { id?: string; now?: Date } = {},
): Deck {
  const now = (opts.now ?? new Date()).toISOString()
  return {
    id: opts.id ?? crypto.randomUUID(),
    name,
    formatId,
    main: {},
    side: {},
    createdAt: now,
    updatedAt: now,
  }
}

/* ---- Editing ---- */

export const MAX_COPIES_PER_ENTRY = 99

export function setCount(deck: Deck, zone: Zone, cardName: string, qty: number): Deck {
  const n = Math.min(MAX_COPIES_PER_ENTRY, Math.max(0, Math.floor(qty)))
  const next = { ...deck[zone] }
  if (n === 0) delete next[cardName]
  else next[cardName] = n
  return { ...deck, [zone]: next }
}

export const addCard = (deck: Deck, zone: Zone, cardName: string, n = 1) =>
  setCount(deck, zone, cardName, (deck[zone][cardName] ?? 0) + n)

export const removeCard = (deck: Deck, zone: Zone, cardName: string, n = 1) =>
  setCount(deck, zone, cardName, (deck[zone][cardName] ?? 0) - n)

/** Move copies between main deck and sideboard. */
export function moveCard(deck: Deck, from: Zone, to: Zone, cardName: string, n = 1): Deck {
  const moved = Math.min(n, deck[from][cardName] ?? 0)
  if (moved === 0) return deck
  return addCard(removeCard(deck, from, cardName, moved), to, cardName, moved)
}

/* ---- Counting ---- */

export const zoneTotal = (deck: Deck, zone: Zone) =>
  Object.values(deck[zone]).reduce((sum, n) => sum + n, 0)

/** Copies of each name across main + sideboard. */
export function copiesByName(deck: Deck): Map<string, number> {
  const m = new Map<string, number>()
  for (const zone of ['main', 'side'] as const) {
    for (const [name, n] of Object.entries(deck[zone])) m.set(name, (m.get(name) ?? 0) + n)
  }
  return m
}

/* ---- Grouping & stats ---- */

/** Display grouping, in deck-list order. Each card belongs to exactly one group. */
export const TYPE_GROUPS = [
  'Creature',
  'Planeswalker',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Land',
  'Other',
] as const
export type TypeGroup = (typeof TYPE_GROUPS)[number]

export function typeGroup(card: Pick<Card, 'typeLine'>): TypeGroup {
  const front = card.typeLine.split('//')[0]
  // Lands first: "Artifact Land" is played as a land. Then creatures win over
  // "Artifact Creature"/"Enchantment Creature".
  if (isLand({ typeLine: front })) return 'Land'
  for (const t of TYPE_GROUPS) {
    if (t !== 'Land' && t !== 'Other' && new RegExp(`\\b${t}\\b`).test(front)) return t
  }
  return 'Other'
}

export interface DeckEntry {
  name: string
  count: number
  card?: Card
}

export function groupEntries(
  deck: Deck,
  zone: Zone,
  resolve: ResolveCard,
): { group: TypeGroup | 'Unknown'; entries: DeckEntry[]; total: number }[] {
  const groups = new Map<TypeGroup | 'Unknown', DeckEntry[]>()
  for (const [name, count] of Object.entries(deck[zone])) {
    const card = resolve(name)
    const g = card ? typeGroup(card) : 'Unknown'
    groups.set(g, [...(groups.get(g) ?? []), { name, count, card }])
  }
  const order: (TypeGroup | 'Unknown')[] = [...TYPE_GROUPS, 'Unknown']
  return order
    .filter((g) => groups.has(g))
    .map((g) => {
      const entries = groups
        .get(g)!
        .sort((a, b) => (a.card?.cmc ?? 0) - (b.card?.cmc ?? 0) || a.name.localeCompare(b.name))
      return { group: g, entries, total: entries.reduce((s, e) => s + e.count, 0) }
    })
}

/** Colored mana symbols in a cost. Hybrid {U/R} counts for both; {W/P} counts as W. */
export function colorPips(manaCost: string): Record<Color, number> {
  const pips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 }
  for (const [, symbol] of manaCost.matchAll(/\{([^}]+)\}/g)) {
    for (const part of symbol.split('/')) {
      if ((COLORS as string[]).includes(part)) pips[part as Color]++
    }
  }
  return pips
}

export const CURVE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'] as const
export type CurveBucket = (typeof CURVE_BUCKETS)[number]

/** The mana curve bucket for a (non-land) card: its mana value, with 7 and up together. */
export const curveBucket = (card: Pick<Card, 'cmc'>): CurveBucket =>
  (card.cmc >= 7 ? '7+' : String(Math.floor(card.cmc))) as CurveBucket

export interface DeckStats {
  mainCount: number
  sideCount: number
  /** Non-land main-deck cards by mana value. */
  curve: Record<CurveBucket, number>
  /** Colored pips across main-deck mana costs (qty-weighted). */
  pips: Record<Color, number>
  types: Partial<Record<TypeGroup, number>>
  lands: number
  averageCmc: number
  /** Sum of known USD prices for main + side. */
  price: number
  unpricedCount: number
  unknownNames: string[]
}

export function deckStats(deck: Deck, resolve: ResolveCard): DeckStats {
  const curve = Object.fromEntries(CURVE_BUCKETS.map((b) => [b, 0])) as DeckStats['curve']
  const pips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 }
  const types: DeckStats['types'] = {}
  const unknown = new Set<string>()
  let lands = 0
  let cmcSum = 0
  let nonLand = 0
  let price = 0
  let unpriced = 0

  for (const [name, n] of Object.entries(deck.main)) {
    const card = resolve(name)
    if (!card) {
      unknown.add(name)
      continue
    }
    const g = typeGroup(card)
    types[g] = (types[g] ?? 0) + n
    if (g === 'Land') {
      lands += n
    } else {
      curve[curveBucket(card)] += n
      cmcSum += card.cmc * n
      nonLand += n
    }
    const cardPips = colorPips(card.manaCost)
    for (const c of COLORS) pips[c] += cardPips[c] * n
  }

  for (const zone of ['main', 'side'] as const) {
    for (const [name, n] of Object.entries(deck[zone])) {
      const card = resolve(name)
      if (!card) {
        unknown.add(name)
        continue
      }
      if (card.prices.usd == null) unpriced += n
      else price += card.prices.usd * n
    }
  }

  return {
    mainCount: zoneTotal(deck, 'main'),
    sideCount: zoneTotal(deck, 'side'),
    curve,
    pips,
    types,
    lands,
    averageCmc: nonLand ? cmcSum / nonLand : 0,
    price: Math.round(price * 100) / 100,
    unpricedCount: unpriced,
    unknownNames: [...unknown],
  }
}
