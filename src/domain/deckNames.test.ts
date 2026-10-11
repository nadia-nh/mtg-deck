import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import { addCard, createDeck, type Deck } from './deck'
import { SUGGEST_AFTER, colorName, isAutoNamed, randomDeckName, suggestDeckName } from './deckNames'
import { seededRng } from './sampleHand'
import grnJson from '../../public/data/sets/grn.json'
import rnaJson from '../../public/data/sets/rna.json'

const cards = [...(grnJson as Card[]), ...(rnaJson as Card[])]
const byName = new Map(cards.map((c) => [c.name, c]))
const resolve = (n: string) => byName.get(n)

const deckOf = (main: Record<string, number>): Deck => {
  let d = createDeck('t', 'pioneer', { id: 't' })
  for (const [n, q] of Object.entries(main)) d = addCard(d, 'main', n, q)
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

describe('randomDeckName', () => {
  test('two capitalised words, repeatable with a seed, and varied', () => {
    const name = randomDeckName(seededRng(1))
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    expect(randomDeckName(seededRng(1))).toBe(name)
    const rng = seededRng(2)
    expect(new Set(Array.from({ length: 50 }, () => randomDeckName(rng))).size).toBeGreaterThan(30)
  })
})

describe('isAutoNamed', () => {
  test('new decks are auto-named until the user names them', () => {
    expect(isAutoNamed({ name: 'Brazen Gambit', nameEdited: false })).toBe(true)
    expect(isAutoNamed({ name: 'My Burn', nameEdited: true })).toBe(false)
  })

  test('decks saved before the flag existed keep their names, except the old default', () => {
    expect(isAutoNamed({ name: 'Boros Aggro' })).toBe(false)
    expect(isAutoNamed({ name: 'Untitled deck' })).toBe(true)
  })
})

describe('colorName', () => {
  test.each([
    [[], 'Colorless'],
    [['R'], 'Mono-Red'],
    [['W', 'R'], 'Boros'],
    [['R', 'U'], 'Izzet'],
    [['B', 'G'], 'Golgari'],
    [['R', 'W', 'U'], 'Jeskai'],
    [['G', 'R', 'W'], 'Naya'],
    [['W', 'U', 'B', 'R'], 'Four-Color'],
    [['W', 'U', 'B', 'R', 'G'], 'Five-Color'],
  ] as const)('%j → %s', (colors, name) => {
    expect(colorName(colors)).toBe(name)
  })
})

describe('suggestDeckName', () => {
  test('waits for enough non-land cards (lands do not count)', () => {
    expect(suggestDeckName(deckOf({ 'Lava Coil': 4, Mountain: 20 }), resolve)).toBeNull()
    expect(suggestDeckName(deckOf({ 'Lava Coil': 4, 'Legion Warboss': 4 }), resolve)).not.toBeNull()
    expect(SUGGEST_AFTER).toBe(8)
  })

  test('the sample Boros deck is Boros Aggro', () => {
    expect(suggestDeckName(deckOf(BOROS), resolve)).toBe('Boros Aggro')
  })

  test('mono-colored creature decks and spell-heavy decks', () => {
    expect(suggestDeckName(deckOf({ 'Legion Warboss': 4, 'Lava Coil': 4 }), resolve)).toBe(
      'Mono-Red Aggro',
    )
    expect(
      suggestDeckName(
        deckOf({ 'Lava Coil': 4, 'Sure Strike': 4, "Assassin's Trophy": 4, Ionize: 4 }),
        resolve,
      ),
    ).toMatch(/ (Spells|Control)$/)
  })

  test('a light splash (under 15% of colored cards) stays out of the name', () => {
    const deck = deckOf({ ...BOROS, Ionize: 1 }) // one blue-red card among 27 colored ones
    expect(suggestDeckName(deck, resolve)).toBe('Boros Aggro')
  })
})
