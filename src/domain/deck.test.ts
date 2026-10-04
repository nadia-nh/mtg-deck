import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import {
  addCard,
  colorPips,
  copiesByName,
  createDeck,
  deckStats,
  groupEntries,
  moveCard,
  removeCard,
  setCount,
  typeGroup,
  zoneTotal,
} from './deck'
import grnJson from '../../public/data/sets/grn.json'

const grn = grnJson as Card[]
const resolve = (name: string) => grn.find((c) => c.name === name)
const empty = () => createDeck('Test', 'pioneer', { id: 'd1', now: new Date('2026-01-01') })

describe('editing', () => {
  test('createDeck', () => {
    expect(empty()).toEqual({
      id: 'd1',
      name: 'Test',
      formatId: 'pioneer',
      main: {},
      side: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(createDeck('x', 'casual').id).toMatch(/[0-9a-f-]{36}/)
  })

  test('add/remove are immutable and clamp at zero', () => {
    const d0 = empty()
    const d1 = addCard(d0, 'main', 'Lava Coil', 3)
    expect(d0.main).toEqual({})
    expect(d1.main).toEqual({ 'Lava Coil': 3 })
    expect(removeCard(d1, 'main', 'Lava Coil').main).toEqual({ 'Lava Coil': 2 })
    expect(removeCard(d1, 'main', 'Lava Coil', 10).main).toEqual({})
    expect(removeCard(d0, 'main', 'Nope').main).toEqual({})
  })

  test('setCount floors, clamps, and deletes at zero', () => {
    const d = setCount(empty(), 'side', 'Lava Coil', 2.7)
    expect(d.side).toEqual({ 'Lava Coil': 2 })
    expect(setCount(d, 'side', 'Lava Coil', -1).side).toEqual({})
    expect(setCount(d, 'side', 'Mountain', 500).side.Mountain).toBe(99)
  })

  test('moveCard moves at most what is there', () => {
    const d = addCard(empty(), 'main', 'Lava Coil', 2)
    const moved = moveCard(d, 'main', 'side', 'Lava Coil', 5)
    expect(moved.main).toEqual({})
    expect(moved.side).toEqual({ 'Lava Coil': 2 })
    expect(moveCard(d, 'side', 'main', 'Lava Coil')).toBe(d)
  })

  test('totals and copies by name span both zones', () => {
    let d = addCard(empty(), 'main', 'Lava Coil', 3)
    d = addCard(d, 'side', 'Lava Coil', 1)
    d = addCard(d, 'main', 'Mountain', 20)
    expect(zoneTotal(d, 'main')).toBe(23)
    expect(zoneTotal(d, 'side')).toBe(1)
    expect(copiesByName(d).get('Lava Coil')).toBe(4)
  })
})

describe('grouping', () => {
  test('typeGroup', () => {
    expect(typeGroup({ typeLine: 'Legendary Creature — Dragon Wizard' })).toBe('Creature')
    expect(typeGroup({ typeLine: 'Artifact Creature — Golem' })).toBe('Creature')
    expect(typeGroup({ typeLine: 'Artifact Land' })).toBe('Land')
    expect(typeGroup({ typeLine: 'Instant // Instant' })).toBe('Instant')
    expect(typeGroup({ typeLine: 'Legendary Planeswalker — Ral' })).toBe('Planeswalker')
    expect(typeGroup({ typeLine: 'Kindred Instant — Elf' })).toBe('Instant')
    expect(typeGroup({ typeLine: 'Battle — Siege' })).toBe('Other')
  })

  test('groupEntries orders groups and sorts by cmc then name', () => {
    let d = addCard(empty(), 'main', 'Mountain', 10)
    d = addCard(d, 'main', 'Light of the Legion', 1)
    d = addCard(d, 'main', 'Boros Challenger', 4)
    d = addCard(d, 'main', 'Lava Coil', 2)
    d = addCard(d, 'main', 'Made Up Card', 1)
    const groups = groupEntries(d, 'main', resolve)
    expect(groups.map((g) => g.group)).toEqual(['Creature', 'Sorcery', 'Land', 'Unknown'])
    expect(groups[0].entries.map((e) => e.name)).toEqual([
      'Boros Challenger',
      'Light of the Legion',
    ])
    expect(groups[0].total).toBe(5)
  })
})

describe('stats', () => {
  test('colorPips handles hybrid, phyrexian, split, generic', () => {
    expect(colorPips('{1}{R}{W}')).toEqual({ W: 1, U: 0, B: 0, R: 1, G: 0 })
    expect(colorPips('{U/R}{U/R} // {X}{U}{U}{R}{R}')).toEqual({ W: 0, U: 4, B: 0, R: 4, G: 0 })
    expect(colorPips('{W/P}{2}')).toEqual({ W: 1, U: 0, B: 0, R: 0, G: 0 })
    expect(colorPips('')).toEqual({ W: 0, U: 0, B: 0, R: 0, G: 0 })
  })

  test('deckStats on a small Boros deck', () => {
    let d = addCard(empty(), 'main', 'Boros Challenger', 4) // 2 cmc, RW
    d = addCard(d, 'main', 'Legion Warboss', 4) // 3 cmc, R
    d = addCard(d, 'main', 'Light of the Legion', 1) // 6 cmc, WW
    d = addCard(d, 'main', 'Mountain', 8)
    d = addCard(d, 'main', 'Sacred Foundry', 2)
    d = addCard(d, 'side', 'Lava Coil', 2)
    d = addCard(d, 'main', 'Bogus Card', 1)

    const s = deckStats(d, resolve)
    expect(s.mainCount).toBe(20)
    expect(s.sideCount).toBe(2)
    expect(s.lands).toBe(10)
    expect(s.curve).toEqual({ '0': 0, '1': 0, '2': 4, '3': 4, '4': 0, '5': 0, '6': 1, '7+': 0 })
    expect(s.averageCmc).toBeCloseTo((4 * 2 + 4 * 3 + 6) / 9)
    expect(s.pips).toEqual({ W: 4 + 2, U: 0, B: 0, R: 4 + 4, G: 0 })
    expect(s.types).toEqual({ Creature: 9, Land: 10 })
    expect(s.unknownNames).toEqual(['Bogus Card'])

    const expectedPrice = [
      ['Boros Challenger', 4],
      ['Legion Warboss', 4],
      ['Light of the Legion', 1],
      ['Mountain', 8],
      ['Sacred Foundry', 2],
      ['Lava Coil', 2],
    ].reduce((sum, [n, q]) => sum + (resolve(n as string)!.prices.usd ?? 0) * (q as number), 0)
    expect(s.price).toBeCloseTo(expectedPrice, 2)
  })

  test('empty deck', () => {
    const s = deckStats(empty(), resolve)
    expect(s.mainCount).toBe(0)
    expect(s.averageCmc).toBe(0)
    expect(s.price).toBe(0)
  })
})
