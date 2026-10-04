import { describe, expect, test } from 'vitest'
import type { Card } from '../card'
import { addCard, createDeck, type Deck } from '../deck'
import { copyLimitOverride } from './constructed'
import { FORMATS, getFormat } from './registry'
import { hasErrors } from './types'
import grnJson from '../../../public/data/sets/grn.json'

const grn = grnJson as Card[]
const byName = new Map(grn.map((c) => [c.name, c]))

// Synthetic cards for statuses GRN doesn't have.
const fake = (name: string, legalities: Card['legalities'], over: Partial<Card> = {}): Card =>
  ({
    ...byName.get('Lava Coil')!,
    id: name,
    name,
    oracleText: '',
    legalities,
    ...over,
  }) as Card
const extras = new Map<string, Card>([
  ['Banned Thing', fake('Banned Thing', { pioneer: 'banned', vintage: 'legal' })],
  ['Restricted Thing', fake('Restricted Thing', { vintage: 'restricted' })],
  [
    'Persistent Petitioners',
    fake(
      'Persistent Petitioners',
      { pioneer: 'legal' },
      {
        oracleText: 'A deck can have any number of cards named Persistent Petitioners.',
      },
    ),
  ],
  [
    'Seven Dwarves',
    fake(
      'Seven Dwarves',
      { pioneer: 'legal' },
      {
        oracleText: 'A deck can have up to seven cards named Seven Dwarves.',
      },
    ),
  ],
])
const resolve = (n: string) => byName.get(n) ?? extras.get(n)

const deckOf = (main: Record<string, number>, side: Record<string, number> = {}): Deck => {
  let d = createDeck('t', 'pioneer', { id: 't' })
  for (const [n, q] of Object.entries(main)) d = addCard(d, 'main', n, q)
  for (const [n, q] of Object.entries(side)) d = addCard(d, 'side', n, q)
  return d
}

/** A legal 60-card Boros Pioneer deck built from GRN. */
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

const codes = (formatId: string, deck: Deck) =>
  getFormat(formatId)
    .validate(deck, resolve)
    .map((i) => i.code)

describe('constructed validation', () => {
  test('the sample Boros deck is exactly 60 and valid in Pioneer', () => {
    const issues = getFormat('pioneer').validate(deckOf(BOROS), resolve)
    expect(issues).toEqual([])
  })

  test.each([
    ['59 cards → main-too-small', { ...BOROS, Mountain: 12 }, {}, ['main-too-small']],
    [
      '16-card sideboard → side-too-large',
      BOROS,
      { 'Lava Coil': 0, 'Divine Visitation': 16 },
      ['too-many-copies', 'side-too-large'],
    ],
    ['5 copies → too-many-copies', { ...BOROS, 'Lava Coil': 5 }, {}, ['too-many-copies']],
    ['4 main + 1 side counts as 5', BOROS, { 'Lava Coil': 1 }, ['too-many-copies']],
    ['20 basics are fine', { ...BOROS, Mountain: 20 }, {}, []],
    ['any-number cards are exempt', { ...BOROS, 'Persistent Petitioners': 20 }, {}, []],
    ['up-to-seven allows 7', { ...BOROS, 'Seven Dwarves': 7 }, {}, []],
    ['up-to-seven rejects 8', { ...BOROS, 'Seven Dwarves': 8 }, {}, ['too-many-copies']],
    ['banned card', { ...BOROS, 'Banned Thing': 1 }, {}, ['banned']],
    ['unknown card is a warning', { ...BOROS, 'Not A Real Card': 1 }, {}, ['unknown-card']],
  ])('%s', (_label, main, side, expected) => {
    const deck = deckOf(main as Record<string, number>, side as Record<string, number>)
    expect(codes('pioneer', deck).sort()).toEqual([...expected].sort())
  })

  test('unknown cards alone do not make a deck invalid', () => {
    const issues = getFormat('pioneer').validate(
      deckOf({ ...BOROS, 'Not A Real Card': 1 }),
      resolve,
    )
    expect(hasErrors(issues)).toBe(false)
  })

  test('Standard flags GRN cards that were never reprinted', () => {
    const issues = getFormat('standard').validate(deckOf(BOROS), resolve)
    const notLegal = issues.filter((i) => i.code === 'not-legal').map((i) => i.cardName)
    expect(notLegal).toContain('Boros Challenger')
    expect(notLegal).not.toContain('Sacred Foundry') // reprinted, Standard-legal
    expect(notLegal).not.toContain('Mountain')
  })

  test('Vintage restricted: 1 copy ok, 2 not', () => {
    expect(codes('vintage', deckOf({ ...BOROS, 'Restricted Thing': 1 }))).toEqual([])
    expect(codes('vintage', deckOf({ ...BOROS, 'Restricted Thing': 2 }))).toEqual(['restricted'])
  })

  test('Casual skips legality entirely', () => {
    expect(codes('casual', deckOf({ ...BOROS, 'Banned Thing': 1 }))).toEqual([])
  })
})

describe('registry', () => {
  test('format ids are unique and getFormat falls back to casual', () => {
    const ids = FORMATS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getFormat('nope').id).toBe('casual')
  })

  test('copyLimitOverride', () => {
    expect(copyLimitOverride(byName.get('Forest')!)).toBe(Infinity)
    expect(copyLimitOverride(byName.get('Lava Coil')!)).toBeUndefined()
    // Surveil reminder text says "any number of them" — must NOT be exempt.
    expect(copyLimitOverride(byName.get('Dimir Informant')!)).toBeUndefined()
  })
})
