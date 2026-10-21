import { expect, test } from 'vitest'
import type { SetSection } from '../domain/search'
import { gridRows } from './useVirtualGrid'

const section = (set: string, start: number, count: number): SetSection => ({
  set,
  setName: set.toUpperCase(),
  start,
  count,
})

test('without sections, cards fill rows of `cols`', () => {
  expect(gridRows(7, 3, [])).toEqual([
    { start: 0, end: 3 },
    { start: 3, end: 6 },
    { start: 6, end: 7 },
  ])
  expect(gridRows(0, 3, [])).toEqual([])
})

test('each section starts with a heading row and its own (possibly short) last row', () => {
  const a = section('war', 0, 4)
  const b = section('grn', 4, 2)
  expect(gridRows(6, 3, [a, b])).toEqual([
    { header: a },
    { start: 0, end: 3 },
    { start: 3, end: 4 },
    { header: b },
    { start: 4, end: 6 },
  ])
})
