import { describe, expect, test } from 'vitest'
import { describeFilter } from './describeFilter'
import type { CardFilter } from './search'

const labels = (f: CardFilter, setName?: (code: string) => string | undefined) =>
  describeFilter(f, setName).map((c) => c.label)

describe('describeFilter', () => {
  test('no filters, no chips', () => {
    expect(describeFilter({})).toEqual([])
    expect(describeFilter({ text: '   ' })).toEqual([])
  })

  test('labels every kind of filter, in filter-panel order', () => {
    const f: CardFilter = {
      text: ' trophy ',
      colors: ['U', 'R'],
      colorless: true,
      colorMode: 'exact',
      multicolor: true,
      guild: 'izzet',
      types: ['Instant', 'Sorcery'],
      rarities: ['rare'],
      cmcMin: 2,
      cmcMax: 3,
      sets: ['grn'],
      allPrintings: true,
    }
    expect(labels(f, (code) => (code === 'grn' ? 'Guilds of Ravnica' : undefined))).toEqual([
      '“trophy”',
      'Blue',
      'Red',
      'Colorless',
      'Exactly these colors',
      'Multicolor',
      'Izzet',
      'Instant',
      'Sorcery',
      'Rare',
      'MV 2–3',
      'Guilds of Ravnica',
      'All printings',
    ])
  })

  test.each([
    [{ cmcMin: 2 }, 'MV ≥ 2'],
    [{ cmcMax: 3 }, 'MV ≤ 3'],
    [{ cmcMin: 0, cmcMax: 0 }, 'MV 0'],
  ])('mana value range %o → %s', (f, label) => {
    expect(labels(f)).toEqual([label])
  })

  test('unknown set codes fall back to the code', () => {
    expect(labels({ sets: ['xyz'] })).toEqual(['XYZ'])
  })

  test('removing a chip drops only that condition', () => {
    const f: CardFilter = { colors: ['U', 'R'], rarities: ['rare'], cmcMin: 2, cmcMax: 3 }
    const chip = (key: string) => describeFilter(f).find((c) => c.key === key)!

    expect(chip('color:U').remove(f)).toEqual({ ...f, colors: ['R'] })
    expect(chip('mv').remove(f)).toEqual({ colors: ['U', 'R'], rarities: ['rare'] })
    // Removing the last value of a list drops the field, so URLs stay clean.
    expect(chip('rarity:rare').remove(f).rarities).toBeUndefined()
    // The original filter is not mutated.
    expect(f).toEqual({ colors: ['U', 'R'], rarities: ['rare'], cmcMin: 2, cmcMax: 3 })
  })

  test('chip keys are unique', () => {
    const keys = describeFilter({
      colors: ['W', 'U', 'B', 'R', 'G'],
      types: ['Creature', 'Land'],
      rarities: ['common', 'mythic'],
    }).map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

test('owned-only shows as an "Owned" chip that removes just that', () => {
  const [chip] = describeFilter({ owned: true })
  expect(chip.label).toBe('Owned')
  expect(chip.remove({ owned: true, colors: ['R'] })).toEqual({ colors: ['R'] })
})
