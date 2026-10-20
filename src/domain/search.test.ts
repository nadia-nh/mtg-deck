import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import {
  cardTypes,
  collectorNumberValue,
  matchesFilter,
  searchCards,
  setSections,
  uniqueByName,
} from './search'
import grnJson from '../../public/data/sets/grn.json'
import warJson from '../../public/data/sets/war.json'

// The committed GRN snapshot doubles as a realistic fixture.
const grn = grnJson as Card[]
const names = (cards: Card[]) => cards.map((c) => c.name)
const byName = (name: string) => grn.find((c) => c.name === name)!

describe('text filter', () => {
  test('matches name, type line, and rules text case-insensitively', () => {
    expect(names(searchCards(grn, { text: 'niv-mizzet' }))).toContain('Niv-Mizzet, Parun')
    expect(names(searchCards(grn, { text: 'dragon wizard' }))).toContain('Niv-Mizzet, Parun')
    expect(names(searchCards(grn, { text: 'MENTOR' })).length).toBeGreaterThan(3)
  })
  test('blank text matches everything', () => {
    expect(searchCards(grn, { text: '   ' })).toHaveLength(grn.length)
  })
})

describe('color filter', () => {
  test('"any" mode includes multicolor cards containing a selected color', () => {
    const res = searchCards(grn, { colors: ['U'] })
    expect(res.every((c) => c.colors.includes('U'))).toBe(true)
    expect(names(res)).toContain('Niv-Mizzet, Parun') // U/R
    expect(names(res)).toContain('Guild Summit') // mono-U
  })
  test('"exact" mode requires exactly the selected colors', () => {
    const res = searchCards(grn, { colors: ['U', 'R'], colorMode: 'exact' })
    expect(res.length).toBeGreaterThan(0)
    expect(res.every((c) => c.colors.length === 2)).toBe(true)
    expect(names(res)).not.toContain('Guild Summit')
  })
  test('colorless toggle', () => {
    const only = searchCards(grn, { colorless: true })
    expect(only.every((c) => c.colors.length === 0)).toBe(true)
    expect(names(only)).toContain('Izzet Guildgate')
    const plusBlue = searchCards(grn, { colors: ['U'], colorless: true })
    expect(names(plusBlue)).toEqual(expect.arrayContaining(['Guild Summit', 'Izzet Guildgate']))
  })
  test('multicolor toggle', () => {
    const res = searchCards(grn, { multicolor: true })
    expect(res.length).toBe(85)
    expect(res.every((c) => c.colors.length >= 2)).toBe(true)
  })
})

describe('guild filter', () => {
  test('Izzet = color identity exactly U/R (gold, hybrid, guildgates)', () => {
    const res = searchCards(grn, { guild: 'izzet' })
    expect(res.every((c) => [...c.colorIdentity].sort().join('') === 'RU')).toBe(true)
    expect(names(res)).toEqual(
      expect.arrayContaining(['Niv-Mizzet, Parun', 'Piston-Fist Cyclops', 'Izzet Guildgate']),
    )
    expect(names(res)).not.toContain('Guild Summit')
  })
  test('Golgari + rare includes Assassin’s Trophy', () => {
    const res = searchCards(grn, { guild: 'golgari', rarities: ['rare'] })
    expect(names(res)).toContain("Assassin's Trophy")
    expect(res.every((c) => c.rarity === 'rare')).toBe(true)
  })
})

describe('type, rarity, cmc, set filters', () => {
  test('cardTypes reads only the left side of the type line', () => {
    expect(cardTypes({ typeLine: 'Legendary Creature — Dragon Wizard' })).toEqual(['Creature'])
    expect(cardTypes({ typeLine: 'Basic Land — Forest' })).toEqual(['Land'])
    expect(cardTypes({ typeLine: 'Artifact Creature — Golem' })).toEqual(['Creature', 'Artifact'])
  })
  test('types are OR-ed', () => {
    const res = searchCards(grn, { types: ['Instant', 'Sorcery'] })
    expect(res.every((c) => /Instant|Sorcery/.test(c.typeLine))).toBe(true)
  })
  test('cmc range is inclusive', () => {
    const res = searchCards(grn, { cmcMin: 2, cmcMax: 3 })
    expect(res.every((c) => c.cmc >= 2 && c.cmc <= 3)).toBe(true)
    expect(names(res)).toContain("Assassin's Trophy")
  })
  test('rarity and set', () => {
    expect(searchCards(grn, { rarities: ['mythic'] })).toHaveLength(18)
    expect(searchCards(grn, { sets: ['rna'] })).toHaveLength(0)
  })
  test('empty filter matches all', () => {
    expect(grn.every((c) => matchesFilter(c, {}))).toBe(true)
  })
})

describe('sorting', () => {
  test('default: newest set first, each set together in collector number order', () => {
    const mixed = [...grn, ...(warJson as Card[])]
    const res = searchCards(mixed, {})
    expect(res[0].set).toBe('war') // War of the Spark (2019) is newer than Guilds (2018)
    const firstGrn = res.findIndex((c) => c.set === 'grn')
    expect(res.slice(firstGrn).every((c) => c.set === 'grn')).toBe(true)
    const warNums = res.slice(0, firstGrn).map((c) => collectorNumberValue(c.collectorNumber))
    expect(warNums).toEqual([...warNums].sort((a, b) => a - b))
  })
  test('default sorts by collector number numerically within a set', () => {
    const nums = searchCards(grn, {}).map((c) => collectorNumberValue(c.collectorNumber))
    expect(nums).toEqual([...nums].sort((a, b) => a - b))
    expect(nums[0]).toBe(1)
  })
  test('cmc then name', () => {
    const res = searchCards(grn, {}, 'cmc')
    for (let i = 1; i < res.length; i++) expect(res[i].cmc).toBeGreaterThanOrEqual(res[i - 1].cmc)
  })
  test('price descending, unpriced last', () => {
    const res = searchCards(grn, {}, 'price')
    const priced = res.filter((c) => c.prices.usd != null).map((c) => c.prices.usd!)
    expect(priced).toEqual([...priced].sort((a, b) => b - a))
    expect(res.at(-1)!.prices.usd).toBeNull()
  })
  test('rarity puts mythics first', () => {
    expect(searchCards(grn, {}, 'rarity')[0].rarity).toBe('mythic')
  })
  test('does not mutate input', () => {
    const copy = [...grn]
    searchCards(grn, {}, 'name')
    expect(grn).toEqual(copy)
    expect(byName('Forest')).toBeDefined()
  })
  test('collectorNumberValue', () => {
    expect(collectorNumberValue('12a')).toBe(12)
    expect(collectorNumberValue('★')).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('uniqueByName', () => {
  test('keeps the best-ranked printing per name and preserves order', () => {
    const a1 = { ...byName('Lava Coil'), id: 'a1' }
    const a2 = { ...byName('Lava Coil'), id: 'a2' }
    const b = { ...byName('Forest'), id: 'b' }
    const rank = (c: Card) => (c.id === 'a2' ? 0 : 1)
    expect(uniqueByName([b, a1, a2], rank).map((c) => c.id)).toEqual(['b', 'a2'])
    expect(uniqueByName([], rank)).toEqual([])
  })
})

describe('owned filter', () => {
  test('keeps only owned names, and ignores the filter when it is off', () => {
    const isOwned = (name: string) => name === 'Lava Coil'
    const owned = searchCards(grn, { owned: true }, 'number', isOwned)
    expect(new Set(owned.map((c) => c.name))).toEqual(new Set(['Lava Coil']))
    expect(searchCards(grn, {}, 'number', isOwned)).toHaveLength(grn.length)
    // No collection given: nothing counts as owned.
    expect(searchCards(grn, { owned: true })).toEqual([])
  })
})

describe('setSections', () => {
  test('splits set-sorted results into one run per set, in order', () => {
    const res = searchCards([...grn, ...(warJson as Card[])], {}, 'number')
    const sections = setSections(res)
    expect(sections.map((s) => [s.set, s.setName])).toEqual([
      ['war', 'War of the Spark'],
      ['grn', 'Guilds of Ravnica'],
    ])
    expect(sections[0].start).toBe(0)
    expect(sections[1].start).toBe(sections[0].count)
    expect(sections[0].count + sections[1].count).toBe(res.length)
  })

  test('a narrow search spread thinly over sets gets no sections', () => {
    const one = (set: string) => ({ ...grn[0], set }) as Card
    const thin = ['war', 'rna', 'grn'].map(one) // one card per set
    expect(setSections(thin)).toEqual([])
    expect(setSections(thin, 1)).toHaveLength(3)
  })

  test('one set (or none) gets no sections', () => {
    expect(setSections(grn)).toEqual([])
    expect(setSections([])).toEqual([])
  })
})
