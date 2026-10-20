import { expect, test } from 'vitest'
import type { SetEntry } from '../data/manifest'
import { groupSetsByYear } from './setGroups'

const set = (code: string, releasedAt: string): SetEntry => ({
  code,
  name: code.toUpperCase(),
  releasedAt,
  cardCount: 0,
  iconSvgUri: '',
  file: `sets/${code}.json`,
  icon: `sets/${code}.svg`,
})

test('groups by release year, newest year and newest set first', () => {
  const groups = groupSetsByYear([
    set('grn', '2018-10-05'),
    set('war', '2019-05-03'),
    set('fdn', '2024-11-15'),
    set('rna', '2019-01-25'),
    set('dsk', '2024-09-27'),
  ])
  expect(groups.map((g) => [g.year, g.sets.map((s) => s.code)])).toEqual([
    ['2024', ['fdn', 'dsk']],
    ['2019', ['war', 'rna']],
    ['2018', ['grn']],
  ])
})

test('no sets, no groups', () => {
  expect(groupSetsByYear([])).toEqual([])
})
