import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import { addCard, createDeck, type Deck } from './deck'
import { missingCards, setOwned } from './collection'
import grnJson from '../../public/data/sets/grn.json'

const byName = new Map((grnJson as Card[]).map((c) => [c.name, c]))
const resolve = (n: string) => byName.get(n)

const deckOf = (main: Record<string, number>, side: Record<string, number> = {}): Deck => {
  let d = createDeck('t', 'pioneer', { id: 't' })
  for (const [n, q] of Object.entries(main)) d = addCard(d, 'main', n, q)
  for (const [n, q] of Object.entries(side)) d = addCard(d, 'side', n, q)
  return d
}

describe('setOwned', () => {
  test('sets, clamps, and removes at zero without mutating', () => {
    const empty = {}
    const one = setOwned(empty, 'Lava Coil', 3)
    expect(one).toEqual({ 'Lava Coil': 3 })
    expect(empty).toEqual({})
    expect(setOwned(one, 'Lava Coil', 0)).toEqual({})
    expect(setOwned(one, 'Lava Coil', -2)).toEqual({})
    expect(setOwned(one, 'Lava Coil', 500)).toEqual({ 'Lava Coil': 99 })
    expect(setOwned(one, 'Lava Coil', 2.7)).toEqual({ 'Lava Coil': 2 })
  })
})

describe('missingCards', () => {
  test('counts main and sideboard together against what you own', () => {
    const deck = deckOf({ 'Lava Coil': 4, 'Legion Warboss': 4 }, { 'Lava Coil': 1 })
    const missing = missingCards(deck, { 'Lava Coil': 2, 'Legion Warboss': 4 }, resolve)
    expect(missing.entries).toEqual([
      expect.objectContaining({ name: 'Lava Coil', need: 5, have: 2, missing: 3 }),
    ])
    expect(missing.count).toBe(3)
  })

  test('basic lands are never missing', () => {
    expect(missingCards(deckOf({ Mountain: 20, Plains: 4 }), {}, resolve).entries).toEqual([])
  })

  test('prices the missing copies, most expensive first; unknown cards are unpriced', () => {
    const deck = deckOf({ 'Lava Coil': 4, 'Sacred Foundry': 4, 'Not A Card': 2 })
    const missing = missingCards(deck, { 'Sacred Foundry': 2 }, resolve)
    const foundry = byName.get('Sacred Foundry')!.prices.usd!
    const coil = byName.get('Lava Coil')!.prices.usd!
    expect(missing.entries.map((e) => e.name)).toEqual(
      foundry * 2 >= coil * 4
        ? ['Sacred Foundry', 'Lava Coil', 'Not A Card']
        : ['Lava Coil', 'Sacred Foundry', 'Not A Card'],
    )
    expect(missing.price).toBeCloseTo(foundry * 2 + coil * 4, 2)
    expect(missing.unpriced).toBe(2)
    expect(missing.count).toBe(8)
  })

  test('owning everything leaves nothing missing', () => {
    const deck = deckOf({ 'Lava Coil': 4 })
    expect(missingCards(deck, { 'Lava Coil': 4 }, resolve)).toEqual({
      entries: [],
      count: 0,
      price: 0,
      unpriced: 0,
    })
  })
})
