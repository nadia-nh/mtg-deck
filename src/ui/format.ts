/** "$1.23", or an em dash when there is no price. */
export const usd = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)
