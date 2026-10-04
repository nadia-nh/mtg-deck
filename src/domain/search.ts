import type { Card, Color, Rarity } from './card'

/* ---- Vocabulary ---- */

export const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G']

export const CARD_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
] as const
export type CardType = (typeof CARD_TYPES)[number]

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic']

/** The ten Ravnica guilds, by color pair. GRN features the first five. */
export const GUILDS = {
  azorius: ['W', 'U'],
  dimir: ['U', 'B'],
  rakdos: ['B', 'R'],
  gruul: ['R', 'G'],
  selesnya: ['G', 'W'],
  orzhov: ['W', 'B'],
  izzet: ['U', 'R'],
  golgari: ['B', 'G'],
  boros: ['R', 'W'],
  simic: ['G', 'U'],
} as const satisfies Record<string, Color[]>
export type Guild = keyof typeof GUILDS

/* ---- Filter model ---- */

/**
 * - `any`:   card has at least one of the selected colors
 * - `exact`: card's colors are exactly the selected colors
 */
export type ColorMode = 'any' | 'exact'

export interface CardFilter {
  /** Case-insensitive substring of name, type line, or rules text. */
  text?: string
  colors?: Color[]
  colorMode?: ColorMode
  /** Include colorless cards (artifacts, lands). */
  colorless?: boolean
  /** Only cards with two or more colors. */
  multicolor?: boolean
  /** Cards whose color identity is exactly the guild's pair (gold, hybrid, guildgates). */
  guild?: Guild
  types?: CardType[]
  rarities?: Rarity[]
  cmcMin?: number
  cmcMax?: number
  sets?: string[]
}

export type SortKey = 'number' | 'name' | 'cmc' | 'price' | 'rarity'

/* ---- Predicates ---- */

const sameColors = (a: readonly Color[], b: readonly Color[]) =>
  a.length === b.length && a.every((c) => b.includes(c))

export function cardTypes(card: Pick<Card, 'typeLine'>): CardType[] {
  // Only the front face's left side of the em dash holds card types.
  const front = card.typeLine.split('//')[0].split('—')[0]
  return CARD_TYPES.filter((t) => new RegExp(`\\b${t}\\b`).test(front))
}

function matchesText(card: Card, text: string): boolean {
  const q = text.trim().toLowerCase()
  if (!q) return true
  return [card.name, card.typeLine, card.oracleText].some((s) => s.toLowerCase().includes(q))
}

function matchesColors(card: Card, f: CardFilter): boolean {
  const selected = f.colors ?? []
  if (selected.length === 0 && !f.colorless) return true

  const isColorless = card.colors.length === 0
  if (isColorless) return !!f.colorless
  if (selected.length === 0) return false // only colorless was asked for

  return f.colorMode === 'exact'
    ? sameColors(card.colors, selected)
    : card.colors.some((c) => selected.includes(c))
}

export function matchesFilter(card: Card, f: CardFilter): boolean {
  if (f.text && !matchesText(card, f.text)) return false
  if (!matchesColors(card, f)) return false
  if (f.multicolor && card.colors.length < 2) return false
  if (f.guild && !sameColors(card.colorIdentity, GUILDS[f.guild])) return false
  if (f.types?.length) {
    const types = cardTypes(card)
    if (!f.types.some((t) => types.includes(t))) return false
  }
  if (f.rarities?.length && !f.rarities.includes(card.rarity)) return false
  if (f.cmcMin != null && card.cmc < f.cmcMin) return false
  if (f.cmcMax != null && card.cmc > f.cmcMax) return false
  if (f.sets?.length && !f.sets.includes(card.set)) return false
  return true
}

/* ---- Sorting ---- */

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 }

/** "12" → 12, "12a" → 12, "★5" → 5; unparsable sorts last. */
export const collectorNumberValue = (n: string) => {
  const m = n.match(/\d+/)
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER
}

const byName = (a: Card, b: Card) => a.name.localeCompare(b.name)

const COMPARATORS: Record<SortKey, (a: Card, b: Card) => number> = {
  number: (a, b) =>
    a.set.localeCompare(b.set) ||
    collectorNumberValue(a.collectorNumber) - collectorNumberValue(b.collectorNumber) ||
    a.collectorNumber.localeCompare(b.collectorNumber),
  name: byName,
  cmc: (a, b) => a.cmc - b.cmc || byName(a, b),
  // Highest price first; unpriced cards last.
  price: (a, b) => (b.prices.usd ?? -1) - (a.prices.usd ?? -1) || byName(a, b),
  rarity: (a, b) => (RARITY_RANK[b.rarity] ?? -1) - (RARITY_RANK[a.rarity] ?? -1) || byName(a, b),
}

export function searchCards(cards: Card[], filter: CardFilter, sort: SortKey = 'number'): Card[] {
  return cards.filter((c) => matchesFilter(c, filter)).sort(COMPARATORS[sort])
}
