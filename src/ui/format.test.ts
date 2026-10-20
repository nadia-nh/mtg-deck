import { expect, test } from 'vitest'
import { cards, count, usd } from './format'

test('counts get thousands separators', () => {
  expect(count(0)).toBe('0')
  expect(count(999)).toBe('999')
  expect(count(5920)).toBe('5,920')
  expect(count(12345678)).toBe('12,345,678')
})

test('prices are dollars with cents and separators, or a dash when missing', () => {
  expect(usd(0.5)).toBe('$0.50')
  expect(usd(12.345)).toBe('$12.35')
  expect(usd(1234.5)).toBe('$1,234.50')
  expect(usd(null)).toBe('—')
})

test('card counts pluralize', () => {
  expect(cards(1)).toBe('1 card')
  expect(cards(0)).toBe('0 cards')
  expect(cards(5920)).toBe('5,920 cards')
})
