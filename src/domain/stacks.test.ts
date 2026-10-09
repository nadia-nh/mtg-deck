import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import { CURVE_BUCKETS, addCard, createDeck, deckStats, type Deck } from './deck'
import { stackByManaValue, stackDeck } from './stacks'
import grnJson from '../../public/data/sets/grn.json'

const grn = grnJson as Card[]
const byName = new Map(grn.map((c) => [c.name, c]))
const resolve = (n: string) => byName.get(n)

const deckOf = (main: Record<string, number>, side: Record<string, number> = {}): Deck => {
  let d = createDeck('t', 'pioneer', { id: 't' })
  for (const [n, q] of Object.entries(main)) d = addCard(d, 'main', n, q)
  for (const [n, q] of Object.entries(side)) d = addCard(d, 'side', n, q)
  return d
}

const BOROS = {
  'Boros Challenger': 4,
  'Legion Warboss': 4,
  'Skyknight Legionnaire': 4,
  'Light of the Legion': 2,
  'Lava Coil': 4,
  'Conclave Tribunal': 4,
  'Sure Strike': 4,
  'Sacred Foundry': 4,
  'Boros Guildgate': 4,
  Mountain: 13,
  Plains: 13,
}

describe('stackByManaValue', () => {
  test('columns are mana values in curve order, then lands; empty ones are left out', () => {
    const stacks = stackByManaValue(deckOf(BOROS), 'main', resolve)
    expect(stacks.map((s) => s.key)).toEqual(['2', '3', '4', '6', 'lands'])
    expect(stacks.at(-1)).toMatchObject({ label: 'Lands', total: 34 })
    expect(stacks.at(-1)!.entries.map((e) => e.name)).toEqual([
      'Boros Guildgate',
      'Mountain',
      'Plains',
      'Sacred Foundry',
    ])
  })

  test('column totals match the mana curve from deckStats', () => {
    const deck = deckOf(BOROS)
    const { curve } = deckStats(deck, resolve)
    const stacks = stackByManaValue(deck, 'main', resolve)
    for (const bucket of CURVE_BUCKETS) {
      expect(stacks.find((s) => s.key === bucket)?.total ?? 0).toBe(curve[bucket])
    }
  })

  test('cards missing from the data get their own last column', () => {
    const stacks = stackByManaValue(deckOf({ 'Lava Coil': 1, 'Not A Card': 2 }), 'main', resolve)
    expect(stacks.map((s) => [s.key, s.total])).toEqual([
      ['2', 1],
      ['unknown', 2],
    ])
  })

  test('works for the sideboard and for an empty zone', () => {
    const deck = deckOf(BOROS, { 'Lava Coil': 0 })
    expect(stackByManaValue(deck, 'side', resolve)).toEqual([])
  })
})

describe('stackDeck by type', () => {
  test('columns follow the deck list type order with plural labels', () => {
    const stacks = stackDeck(deckOf(BOROS), 'main', resolve, 'type')
    expect(stacks.map((s) => [s.label, s.total])).toEqual([
      ['Creatures', 14],
      ['Instants', 4],
      ['Sorceries', 4],
      ['Enchantments', 4],
      ['Lands', 34],
    ])
  })

  test('within a column, cards go by mana value, then name', () => {
    const creatures = stackDeck(deckOf(BOROS), 'main', resolve, 'type')[0]
    expect(creatures.entries.map((e) => e.name)).toEqual([
      'Boros Challenger', // 2
      'Legion Warboss', // 2
      'Skyknight Legionnaire', // 3
      'Light of the Legion', // 6
    ])
  })
})

describe('stackDeck by color', () => {
  test('mono colors in WUBRG order, then multicolor, colorless and lands', () => {
    const deck = deckOf({
      'Lava Coil': 1, // R
      'Conclave Tribunal': 1, // W
      'Boros Challenger': 1, // RW
      "Assassin's Trophy": 1, // BG
      Mountain: 2,
    })
    expect(stackDeck(deck, 'main', resolve, 'color').map((s) => [s.label, s.total])).toEqual([
      ['White', 1],
      ['Red', 1],
      ['Multicolor', 2],
      ['Lands', 2],
    ])
  })

  test('every card in the zone lands in exactly one column, whatever the grouping', () => {
    const deck = deckOf(BOROS, { 'Justice Strike': 2 })
    for (const by of ['mv', 'type', 'color'] as const) {
      for (const zone of ['main', 'side'] as const) {
        const total = stackDeck(deck, zone, resolve, by).reduce((n, s) => n + s.total, 0)
        expect(total, `${by}/${zone}`).toBe(zone === 'main' ? 60 : 2)
      }
    }
  })
})
