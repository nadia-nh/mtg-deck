import { describe, expect, test } from 'vitest'
import { viewFromSearch, viewUrl } from './view'

describe('view URL state', () => {
  test('reads view=deck; anything else is browse', () => {
    expect(viewFromSearch('?view=deck')).toBe('deck')
    expect(viewFromSearch('?q=coil&view=deck')).toBe('deck')
    expect(viewFromSearch('')).toBe('browse')
    expect(viewFromSearch('?view=junk')).toBe('browse')
  })

  test('switching keeps the browse filters', () => {
    expect(viewUrl('deck', '/', '?g=izzet&r=rare')).toBe('/?g=izzet&r=rare&view=deck')
    expect(viewUrl('browse', '/', '?g=izzet&r=rare&view=deck')).toBe('/?g=izzet&r=rare')
  })

  test('browse with no filters is the bare path', () => {
    expect(viewUrl('browse', '/mtg-deck/', '?view=deck')).toBe('/mtg-deck/')
    expect(viewUrl('deck', '/', '')).toBe('/?view=deck')
  })
})
