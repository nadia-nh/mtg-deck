import { describe, expect, test } from 'vitest'
import { addCard, createDeck } from './deck'
import {
  HAND_SIZE,
  deckCards,
  drawCard,
  mulligan,
  newHand,
  putOnBottom,
  seededRng,
  shuffle,
} from './sampleHand'

const sorted = (xs: readonly string[]) => [...xs].sort()

// 24 lands + 36 spells, as plain names.
const DECK = [
  ...Array<string>(24).fill('Land'),
  ...Array.from({ length: 36 }, (_, i) => `Spell ${i}`),
]

describe('seeded random source', () => {
  test('the same seed gives the same sequence; values are in [0, 1)', () => {
    const a = seededRng(42)
    const b = seededRng(42)
    const xs = Array.from({ length: 100 }, () => a())
    expect(Array.from({ length: 100 }, () => b())).toEqual(xs)
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(seededRng(43)()).not.toBe(seededRng(42)())
  })
})

describe('deckCards', () => {
  test('one entry per copy in the main deck; the sideboard is not shuffled in', () => {
    let deck = createDeck('t', 'pioneer', { id: 't' })
    deck = addCard(deck, 'main', 'Lava Coil', 4)
    deck = addCard(deck, 'main', 'Mountain', 2)
    deck = addCard(deck, 'side', 'Justice Strike', 2)
    expect(sorted(deckCards(deck))).toEqual(
      sorted([...Array(4).fill('Lava Coil'), 'Mountain', 'Mountain']),
    )
  })
})

describe('shuffle', () => {
  test('keeps every card and leaves the input alone', () => {
    const input = [...DECK]
    const out = shuffle(input, seededRng(1))
    expect(sorted(out)).toEqual(sorted(DECK))
    expect(input).toEqual(DECK)
    expect(out).not.toEqual(DECK)
  })

  test('every position is about equally likely for a card (Fisher–Yates, not a biased sort)', () => {
    const rng = seededRng(7)
    const counts = Array<number>(5).fill(0)
    const trials = 20_000
    for (let i = 0; i < trials; i++) counts[shuffle([0, 1, 2, 3, 4], rng).indexOf(0)]++
    for (const c of counts) expect(c / trials).toBeCloseTo(0.2, 1)
  })
})

describe('hands', () => {
  test('a new hand is seven cards; the rest is the library', () => {
    const state = newHand(DECK, seededRng(3))
    expect(state.hand).toHaveLength(HAND_SIZE)
    expect(state.library).toHaveLength(60 - HAND_SIZE)
    expect(state).toMatchObject({ mulligans: 0, toBottom: 0 })
    expect(sorted([...state.hand, ...state.library])).toEqual(sorted(DECK))
  })

  test('London mulligan: draw seven again, then put one card per mulligan on the bottom', () => {
    const rng = seededRng(5)
    let state = mulligan(mulligan(newHand(DECK, rng), rng), rng)
    expect(state.hand).toHaveLength(7)
    expect(state).toMatchObject({ mulligans: 2, toBottom: 2 })

    const bottomed = state.hand[0]
    state = putOnBottom(state, 0)
    expect(state.library.at(-1)).toBe(bottomed)
    state = putOnBottom(state, 0)
    expect(state.hand).toHaveLength(5)
    expect(state.toBottom).toBe(0)
    // Nothing more is owed, so further picks are ignored.
    expect(putOnBottom(state, 0)).toBe(state)
    expect(sorted([...state.hand, ...state.library])).toEqual(sorted(DECK))
  })

  test('drawing takes the top of the library; an empty library draws nothing', () => {
    const state = newHand(DECK, seededRng(9))
    const next = drawCard(state)
    expect(next.hand).toEqual([...state.hand, state.library[0]])
    expect(next.library).toEqual(state.library.slice(1))

    const tiny = newHand(['A', 'B'], seededRng(1))
    expect(tiny.hand).toHaveLength(2)
    expect(drawCard(tiny)).toBe(tiny)
  })

  test('statistical sanity: lands in the opening hand average 7 × 24/60 = 2.8', () => {
    const rng = seededRng(2026)
    const trials = 5_000
    let lands = 0
    for (let i = 0; i < trials; i++) {
      lands += newHand(DECK, rng).hand.filter((c) => c === 'Land').length
    }
    expect(lands / trials).toBeCloseTo(2.8, 1)
  })
})
