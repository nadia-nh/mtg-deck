import type { Deck } from './deck'

/**
 * Sample hands for goldfishing a deck: shuffle, draw seven, London mulligan, draw.
 * Pure: every function takes the random source, so tests (and `?seed=` links) are repeatable.
 */

/** A random source returning numbers in [0, 1), like Math.random. */
export type Rng = () => number

export const HAND_SIZE = 7

/** Small, fast seeded generator (mulberry32), good enough for shuffling cards. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One entry per physical card in the main deck, e.g. 4 × Lava Coil → four "Lava Coil". */
export function deckCards(deck: Deck): string[] {
  return Object.entries(deck.main).flatMap(([name, n]) => Array<string>(n).fill(name))
}

/** Fisher–Yates: every order equally likely. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export interface HandState {
  hand: string[]
  /** Top of the library first. */
  library: string[]
  /** Mulligans taken for this hand (0 for the first seven). */
  mulligans: number
  /** Cards still to put on the bottom after a London mulligan. */
  toBottom: number
}

/** Shuffle the whole deck and draw seven. */
export function newHand(cards: readonly string[], rng: Rng, mulligans = 0): HandState {
  const library = shuffle(cards, rng)
  return {
    hand: library.slice(0, HAND_SIZE),
    library: library.slice(HAND_SIZE),
    mulligans,
    toBottom: Math.min(mulligans, HAND_SIZE),
  }
}

/** London mulligan: shuffle everything back, draw seven again, then bottom one more card. */
export function mulligan(state: HandState, rng: Rng): HandState {
  return newHand([...state.hand, ...state.library], rng, state.mulligans + 1)
}

/** Put the hand card at `index` on the bottom of the library (while a mulligan is owed). */
export function putOnBottom(state: HandState, index: number): HandState {
  if (state.toBottom === 0 || index < 0 || index >= state.hand.length) return state
  const card = state.hand[index]
  return {
    ...state,
    hand: state.hand.filter((_, i) => i !== index),
    library: [...state.library, card],
    toBottom: state.toBottom - 1,
  }
}

/** Draw the top card of the library (nothing happens when it is empty). */
export function drawCard(state: HandState): HandState {
  if (state.library.length === 0) return state
  return { ...state, hand: [...state.hand, state.library[0]], library: state.library.slice(1) }
}
