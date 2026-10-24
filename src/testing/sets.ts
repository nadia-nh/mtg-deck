/**
 * Real snapshot sets for tests, with their prices attached the way the app loads them
 * (cards and prices are separate files; see src/data/prices.ts).
 */
import { withPrices, type PriceTable, type StoredCard } from '../data/prices'
import grnCards from '../../public/data/sets/grn.json'
import grnPrices from '../../public/data/sets/grn.prices.json'
import rnaCards from '../../public/data/sets/rna.json'
import rnaPrices from '../../public/data/sets/rna.prices.json'
import warCards from '../../public/data/sets/war.json'
import warPrices from '../../public/data/sets/war.prices.json'

const load = (cards: unknown, prices: unknown) =>
  withPrices(cards as StoredCard[], prices as PriceTable)

export const grn = load(grnCards, grnPrices)
export const rna = load(rnaCards, rnaPrices)
export const war = load(warCards, warPrices)
