import { describe, expect, test } from 'vitest'
import { isBasicLand, isLand, normalizeCard, type ScryfallCard } from './card'
import doomWhisperer from './__fixtures__/doom-whisperer.json'
import assassinsTrophy from './__fixtures__/assassins-trophy.json'
import delver from './__fixtures__/delver-dfc.json'

describe('normalizeCard', () => {
  test('creature (Doom Whisperer)', () => {
    const c = normalizeCard(doomWhisperer as ScryfallCard)
    expect(c.name).toBe('Doom Whisperer')
    expect(c.set).toBe('grn')
    expect(c.manaCost).toBe('{3}{B}{B}')
    expect(c.cmc).toBe(5)
    expect(c.colors).toEqual(['B'])
    expect(c.power).toBe('6')
    expect(c.toughness).toBe('6')
    expect(c.rarity).toBe('mythic')
    expect(c.keywords).toEqual(expect.arrayContaining(['Flying', 'Trample']))
    expect(c.images?.normal).toMatch(/^https:\/\/cards\.scryfall\.io\//)
    expect(c.faces).toBeUndefined()
    expect(c.legalities.modern).toBeDefined()
  })

  test("multicolor instant (Assassin's Trophy)", () => {
    const c = normalizeCard(assassinsTrophy as ScryfallCard)
    expect(c.colors).toEqual(['B', 'G'])
    expect(c.colorIdentity).toEqual(['B', 'G'])
    expect(c.typeLine).toBe('Instant')
    expect(c.power).toBeUndefined()
    expect(c.oracleText).toMatch(/Destroy target permanent an opponent controls/)
    expect(c.tcgplayerId).toBeTypeOf('number')
  })

  test('double-faced card (Delver of Secrets) falls back to face data', () => {
    const c = normalizeCard(delver as ScryfallCard)
    expect(c.layout).toBe('transform')
    expect(c.faces).toHaveLength(2)
    expect(c.faces?.[1].name).toBe('Insectile Aberration')
    expect(c.manaCost).toBe('{U}')
    expect(c.typeLine).toMatch(/Human Wizard/)
    expect(c.colors).toEqual(['U'])
    expect(c.images?.normal).toBeTruthy()
    expect(c.oracleText).toContain('//')
  })

  test('prices parse to numbers or null', () => {
    const raw = { ...(doomWhisperer as ScryfallCard), prices: { usd: '12.34', usd_foil: null } }
    expect(normalizeCard(raw).prices).toEqual({ usd: 12.34, usdFoil: null })
  })
})

describe('type helpers', () => {
  test('basic land detection', () => {
    expect(isBasicLand({ typeLine: 'Basic Land — Forest' })).toBe(true)
    expect(isBasicLand({ typeLine: 'Land — Gate' })).toBe(false)
    expect(isLand({ typeLine: 'Land — Gate' })).toBe(true)
    expect(isLand({ typeLine: 'Creature — Elf' })).toBe(false)
  })
})
