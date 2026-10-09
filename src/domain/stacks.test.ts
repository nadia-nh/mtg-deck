import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import { CURVE_BUCKETS, addCard, createDeck, deckStats, type Deck } from './deck'
import { stackByManaValue } from './stacks'
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
