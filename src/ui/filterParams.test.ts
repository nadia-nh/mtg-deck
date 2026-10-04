import { describe, expect, test } from 'vitest'
import { stateFromParams, stateToParams, type BrowseState } from './filterParams'

describe('filter <-> URL params', () => {
  test('round-trips a full state', () => {
    const state: BrowseState = {
      filter: {
        text: 'mentor',
        colors: ['R', 'W'],
        colorMode: 'exact',
        colorless: true,
        multicolor: true,
        guild: 'boros',
        types: ['Creature', 'Instant'],
        rarities: ['rare', 'mythic'],
        cmcMin: 1,
        cmcMax: 3,
        sets: ['grn'],
        allPrintings: true,
      },
      sort: 'price',
    }
    const params = stateToParams(state)
    expect(params.get('c')).toBe('WR') // WUBRG order
    const back = stateFromParams(params)
    expect(back.sort).toBe('price')
    expect(back.filter).toEqual({ ...state.filter, colors: ['W', 'R'] })
  })

  test('default state produces an empty query', () => {
    expect(stateToParams({ filter: {}, sort: 'number' }).toString()).toBe('')
    expect(stateFromParams(new URLSearchParams())).toEqual({ filter: {}, sort: 'number' })
  })

  test('ignores junk values', () => {
    const s = stateFromParams(
      new URLSearchParams('c=uxz&g=notaguild&t=Creature,Bogus&r=epic&cmin=abc&sort=evil'),
    )
    expect(s).toEqual({ filter: { colors: ['U'], types: ['Creature'] }, sort: 'number' })
  })

  test('cmc 0 is preserved', () => {
    expect(
      stateFromParams(stateToParams({ filter: { cmcMax: 0 }, sort: 'number' })).filter,
    ).toEqual({ cmcMax: 0 })
  })
})
