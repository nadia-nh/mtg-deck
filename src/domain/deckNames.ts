import type { Color } from './card'
import { typeGroup, type Deck, type ResolveCard } from './deck'
import { COLORS, GUILDS } from './search'

/**
 * Deck names the app picks itself: a random two-word name for a new deck, then a
 * descriptive one ("Boros Aggro") once there are enough cards to tell what the deck is.
 * The user's own name always wins (Deck.nameEdited).
 */

/** The default name before this module existed; such decks still count as auto-named. */
export const LEGACY_DEFAULT_NAME = 'Untitled deck'

// Original word lists (no card or set names), so every pairing reads as a plausible title.
const ADJECTIVES = [
  'Brazen',
  'Silent',
  'Restless',
  'Gilded',
  'Hidden',
  'Reckless',
  'Patient',
  'Crimson',
  'Hollow',
  'Wandering',
  'Bitter',
  'Radiant',
  'Shrouded',
  'Feral',
  'Clever',
  'Thundering',
  'Quiet',
  'Stubborn',
  'Wild',
  'Midnight',
  'Iron',
  'Velvet',
  'Burning',
  'Frozen',
] as const

const NOUNS = [
  'Gambit',
  'Gathering',
  'Tide',
  'Ember',
  'Bargain',
  'Engine',
  'Parade',
  'Tempest',
  'Rumor',
  'Vanguard',
  'Lantern',
  'Covenant',
  'Ambush',
  'Harvest',
  'Chorus',
  'Spark',
  'Labyrinth',
  'Wager',
  'Requiem',
  'Mosaic',
  'Uprising',
  'Riddle',
  'Bonfire',
  'Gauntlet',
] as const

/** A random name like "Brazen Gambit" for a new deck. `rng` returns numbers in [0, 1). */
export function randomDeckName(rng: () => number = Math.random): string {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`
}

/** Whether the app may rename this deck (the user hasn't named it). */
export const isAutoNamed = (deck: Pick<Deck, 'name' | 'nameEdited'>) =>
  deck.nameEdited === false || (deck.nameEdited === undefined && deck.name === LEGACY_DEFAULT_NAME)

/** Non-land cards needed in the main deck before the app suggests a descriptive name. */
export const SUGGEST_AFTER = 8

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

const MONO: Record<Color, string> = {
  W: 'Mono-White',
  U: 'Mono-Blue',
  B: 'Mono-Black',
  R: 'Mono-Red',
  G: 'Mono-Green',
}

// Three-color families, keyed by colors in WUBRG order.
const TRIOS: Record<string, string> = {
  WUG: 'Bant',
  WUB: 'Esper',
  UBR: 'Grixis',
  BRG: 'Jund',
  WRG: 'Naya',
  WBG: 'Abzan',
  WUR: 'Jeskai',
  UBG: 'Sultai',
  WBR: 'Mardu',
  URG: 'Temur',
}

/** The name for a set of colors: "Mono-Red", "Boros", "Jeskai", "Four-Color", "Colorless". */
export function colorName(colors: readonly Color[]): string {
  const ordered = COLORS.filter((c) => colors.includes(c))
  if (ordered.length === 0) return 'Colorless'
  if (ordered.length === 1) return MONO[ordered[0]]
  if (ordered.length === 2) {
    const guild = Object.entries(GUILDS).find(
      ([, pair]) =>
        pair.length === 2 && ordered.every((c) => (pair as readonly Color[]).includes(c)),
    )
    return guild ? capitalize(guild[0]) : ordered.join('')
  }
  if (ordered.length === 3) return TRIOS[ordered.join('')] ?? 'Three-Color'
  return ordered.length === 4 ? 'Four-Color' : 'Five-Color'
}

/**
 * A descriptive name from the main deck, e.g. "Boros Aggro", or null while there are
 * fewer than SUGGEST_AFTER non-land cards. Colors that make up under 15% of the colored
 * non-land cards (a light splash) are left out of the name.
 */
export function suggestDeckName(deck: Deck, resolve: ResolveCard): string | null {
  let nonLand = 0
  let creatures = 0
  let spells = 0
  let mvSum = 0
  const colorCopies: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 }

  for (const [name, n] of Object.entries(deck.main)) {
    const card = resolve(name)
    if (!card) continue
    const group = typeGroup(card)
    if (group === 'Land') continue
    nonLand += n
    mvSum += card.cmc * n
    if (group === 'Creature') creatures += n
    if (group === 'Instant' || group === 'Sorcery') spells += n
    for (const c of card.colors) colorCopies[c] += n
  }
  if (nonLand < SUGGEST_AFTER) return null

  const colored = COLORS.reduce((sum, c) => sum + colorCopies[c], 0)
  const colors = COLORS.filter((c) => colored > 0 && colorCopies[c] / colored >= 0.15)
  const avgMv = mvSum / nonLand

  let style: string
  if (creatures / nonLand >= 0.4) style = avgMv <= 3 ? 'Aggro' : 'Midrange'
  else if (spells / nonLand >= 0.4) style = avgMv >= 3 ? 'Control' : 'Spells'
  else style = 'Midrange'

  return `${colorName(colors)} ${style}`
}
