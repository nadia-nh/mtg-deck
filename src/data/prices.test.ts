import { expect, test } from 'vitest'
import type { Card } from '../domain/card'
import { splitPrices, withPrices } from './prices'

const card = (id: string, usd: number | null, usdFoil: number | null) =>
  ({ id, name: id, prices: { usd, usdFoil } }) as Card

test('splits prices off the cards and puts them back unchanged', () => {
  const cards = [card('a', 1.5, 3), card('b', null, 0.25), card('c', null, null)]
  const { cards: stored, prices } = splitPrices(cards)
  expect(stored.every((c) => !('prices' in c))).toBe(true)
  expect(prices).toEqual({ a: [1.5, 3], b: [null, 0.25] }) // unpriced cards are left out
  expect(withPrices(stored, prices)).toEqual(cards)
})

test('without a price table, cards have no prices', () => {
  const { cards: stored } = splitPrices([card('a', 1, 2)])
  expect(withPrices(stored)[0].prices).toEqual({ usd: null, usdFoil: null })
})
