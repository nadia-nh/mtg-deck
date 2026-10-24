import type { Card } from '../domain/card'

/** A card as stored in `sets/<code>.json`: everything but prices, which change every refresh. */
export type StoredCard = Omit<Card, 'prices'>

/**
 * Prices for one set, keyed by card id: [usd, usdFoil]. Stored apart from the cards
 * (`sets/<code>.prices.json`) so a price refresh rewrites only these small files and the
 * card files stay byte-identical, which keeps the git history from growing by megabytes
 * per refresh. Cards with no prices at all are left out.
 */
export type PriceTable = Record<string, [number | null, number | null]>

export function splitPrices(cards: readonly Card[]): { cards: StoredCard[]; prices: PriceTable } {
  const prices: PriceTable = {}
  const stored = cards.map(({ prices: p, ...card }) => {
    if (p.usd != null || p.usdFoil != null) prices[card.id] = [p.usd, p.usdFoil]
    return card
  })
  return { cards: stored, prices }
}

/** Puts prices back on stored cards; a card missing from the table has no prices. */
export function withPrices(cards: readonly StoredCard[], prices: PriceTable = {}): Card[] {
  return cards.map((card) => {
    const [usd, usdFoil] = prices[card.id] ?? [null, null]
    return { ...card, prices: { usd, usdFoil } }
  })
}
