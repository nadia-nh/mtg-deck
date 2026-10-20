// Fixed to en-US so numbers match the app's English text (and the e2e tests) everywhere.
const countFormat = new Intl.NumberFormat('en-US')
const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** "5,920". */
export const count = (n: number) => countFormat.format(n)

/** "$1,234.56", or an em dash when there is no price. */
export const usd = (n: number | null) => (n == null ? '—' : usdFormat.format(n))

/** "5,920 cards", "1 card". */
export const cards = (n: number) => `${count(n)} ${n === 1 ? 'card' : 'cards'}`
