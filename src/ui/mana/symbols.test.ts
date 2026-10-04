import { describe, expect, test } from 'vitest'
import { describeSymbol, manaCostLabel, tokenize } from './symbols'

describe('describeSymbol', () => {
  test.each([
    ['W', 'ms-w', 'white'],
    ['u', 'ms-u', 'blue'],
    ['C', 'ms-c', 'colorless'],
    ['2', 'ms-2', '2 generic'],
    ['15', 'ms-15', '15 generic'],
    ['X', 'ms-x', 'X'],
    ['T', 'ms-tap', 'tap'],
    ['Q', 'ms-untap', 'untap'],
    ['S', 'ms-s', 'snow'],
    ['U/R', 'ms-ur', 'blue or red'],
    ['R/W', 'ms-rw', 'red or white'],
    ['2/W', 'ms-2w', '2 generic or white'],
    ['W/P', 'ms-wp', 'phyrexian white'],
    ['G/U/P', 'ms-gup', 'phyrexian green or blue'],
  ])('{%s} → %s (%s)', (inner, className, label) => {
    expect(describeSymbol(inner)).toEqual({ className, label })
  })

  test('unknown symbols fall back to text', () => {
    expect(describeSymbol('HW')).toEqual({ className: null, label: 'HW' })
  })
})

describe('tokenize', () => {
  test('mixes text and symbols (rules text)', () => {
    const t = tokenize('{T}: Add {G}.')
    expect(t.map((x) => (x.kind === 'text' ? x.text : x.className))).toEqual([
      'ms-tap',
      ': Add ',
      'ms-g',
      '.',
    ])
  })
  test('plain text and empty', () => {
    expect(tokenize('Flying')).toEqual([{ kind: 'text', text: 'Flying' }])
    expect(tokenize('')).toEqual([])
  })
})

describe('manaCostLabel', () => {
  test('costs, split cards, and no cost', () => {
    expect(manaCostLabel('{2}{W}{U}')).toBe('2 generic, white, blue')
    expect(manaCostLabel('{U/R}{U/R} // {X}{U}{U}{R}{R}')).toBe(
      'blue or red, blue or red // X, blue, blue, red, red',
    )
    expect(manaCostLabel('')).toBe('no mana cost')
  })
})
