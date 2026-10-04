import { describe, expect, test } from 'vitest'
import type { Card } from './card'
import { addCard, createDeck } from './deck'
import { parseDecklist, serializeDecklist } from './decklist'
import { buildCardDb, resolveCardName } from '../data/loadCards'
import grnJson from '../../public/data/sets/grn.json'
import delverRaw from './__fixtures__/delver-dfc.json'
import { normalizeCard, type ScryfallCard } from './card'

const db = buildCardDb({ fetchedAt: '', sets: [] }, [
  ...(grnJson as Card[]),
  normalizeCard(delverRaw as ScryfallCard),
])
const resolve = (n: string) => resolveCardName(db, n)

describe('parseDecklist', () => {
  test('Arena format with headers, set codes, and sideboard', () => {
    const r = parseDecklist(
      `About
Name Boros Aggro

Deck
4 Boros Challenger (GRN) 156
4 Lava Coil (GRN) 108
13 Mountain (GRN) 263

Sideboard
2 Divine Visitation (GRN) 10
`,
      resolve,
    )
    expect(r.name).toBe('Boros Aggro')
    expect(r.main).toEqual({ 'Boros Challenger': 4, 'Lava Coil': 4, Mountain: 13 })
    expect(r.side).toEqual({ 'Divine Visitation': 2 })
    expect(r.unknown).toEqual([])
    expect(r.invalidLines).toEqual([])
  })

  test('MTGO/plain format: blank line starts the sideboard; "x" counts; SB: prefix', () => {
    const r = parseDecklist(
      '4x Lava Coil\n20 Mountain\n\n2 Divine Visitation\nSB: 1 Lava Coil',
      resolve,
    )
    expect(r.main).toEqual({ 'Lava Coil': 4, Mountain: 20 })
    expect(r.side).toEqual({ 'Divine Visitation': 2, 'Lava Coil': 1 })
  })

  test('merges duplicates, ignores comments, case-insensitive names, CRLF', () => {
    const r = parseDecklist('// my deck\r\n2 lava coil\r\n# note\r\n2 LAVA COIL\r\n', resolve)
    expect(r.main).toEqual({ 'Lava Coil': 4 })
  })

  test('split cards with // or ///, and DFC front-face names', () => {
    const r = parseDecklist(
      '1 Expansion /// Explosion\n1 expansion // explosion\n4 Delver of Secrets',
      resolve,
    )
    expect(r.main).toEqual({
      'Expansion // Explosion': 2,
      'Delver of Secrets // Insectile Aberration': 4,
    })
  })

  test('reports unknown names and invalid lines', () => {
    const r = parseDecklist('4 Lava Coil\n3 Lava Coyl\n1 Lava Coyl\nfour Mountains\n', resolve)
    expect(r.main).toEqual({ 'Lava Coil': 4 })
    expect(r.unknown).toEqual([{ name: 'Lava Coyl', count: 4 }])
    expect(r.invalidLines).toEqual([{ lineNumber: 4, text: 'four Mountains' }])
  })

  test('blank lines inside a headered list do not switch zones', () => {
    const r = parseDecklist('Deck\n4 Lava Coil\n\n4 Mountain\nSideboard\n1 Lava Coil', resolve)
    expect(r.main).toEqual({ 'Lava Coil': 4, Mountain: 4 })
    expect(r.side).toEqual({ 'Lava Coil': 1 })
  })
})

describe('serializeDecklist', () => {
  let deck = createDeck('t', 'pioneer', { id: 't' })
  deck = addCard(deck, 'main', 'Mountain', 13)
  deck = addCard(deck, 'main', 'Lava Coil', 4)
  deck = addCard(deck, 'main', 'Boros Challenger', 4)
  deck = addCard(deck, 'side', 'Divine Visitation', 2)

  test('arena format', () => {
    expect(serializeDecklist(deck, resolve, 'arena')).toBe(
      `Deck
4 Boros Challenger (GRN) 156
4 Lava Coil (GRN) 108
13 Mountain (GRN) ${resolve('Mountain')!.collectorNumber}

Sideboard
2 Divine Visitation (GRN) ${resolve('Divine Visitation')!.collectorNumber}
`,
    )
  })

  test('text format and round-trips for both formats', () => {
    expect(serializeDecklist(deck, resolve, 'text')).toBe(
      '4 Boros Challenger\n4 Lava Coil\n13 Mountain\n\n2 Divine Visitation\n',
    )
    for (const f of ['arena', 'text'] as const) {
      const back = parseDecklist(serializeDecklist(deck, resolve, f), resolve)
      expect(back.main).toEqual(deck.main)
      expect(back.side).toEqual(deck.side)
      expect(back.unknown).toEqual([])
    }
  })

  test('no sideboard section when empty', () => {
    const d = addCard(createDeck('x', 'pioneer'), 'main', 'Lava Coil', 1)
    expect(serializeDecklist(d, resolve, 'arena')).toBe('Deck\n1 Lava Coil (GRN) 108\n')
  })
})
