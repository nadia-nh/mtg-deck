/**
 * Turns Scryfall mana notation ("{2}{W}{U/R}", "{T}: Add {G}.") into tokens
 * that map to the open-source Mana font (https://mana.andrewgioia.com) plus
 * a spoken label for screen readers.
 */

export type ManaToken =
  | { kind: 'symbol'; raw: string; className: string | null; label: string }
  | { kind: 'text'; text: string }

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
  C: 'colorless',
}

const SPECIAL: Record<string, { className: string; label: string }> = {
  T: { className: 'ms-tap', label: 'tap' },
  Q: { className: 'ms-untap', label: 'untap' },
  E: { className: 'ms-e', label: 'energy' },
  S: { className: 'ms-s', label: 'snow' },
  X: { className: 'ms-x', label: 'X' },
  Y: { className: 'ms-y', label: 'Y' },
  Z: { className: 'ms-z', label: 'Z' },
  '½': { className: 'ms-1-2', label: 'one half' },
  '∞': { className: 'ms-infinity', label: 'infinity' },
}

/** Mana font class + spoken label for one symbol's inner text, e.g. "W/U". */
export function describeSymbol(inner: string): { className: string | null; label: string } {
  const s = inner.toUpperCase()

  if (/^\d+$/.test(s)) return { className: `ms-${s}`, label: `${s} generic` }
  if (SPECIAL[s]) return SPECIAL[s]
  if (COLOR_NAMES[s]) return { className: `ms-${s.toLowerCase()}`, label: COLOR_NAMES[s] }

  const parts = s.split('/')
  const phyrexian = parts.at(-1) === 'P'
  const colors = phyrexian ? parts.slice(0, -1) : parts
  if (colors.length >= 1 && colors.length <= 2) {
    const named = colors.map((p) => (/^\d+$/.test(p) ? `${p} generic` : (COLOR_NAMES[p] ?? p)))
    const label = `${phyrexian ? 'phyrexian ' : ''}${named.join(' or ')}`
    const className = `ms-${colors.join('').toLowerCase()}${phyrexian ? 'p' : ''}`
    if (colors.every((p) => COLOR_NAMES[p] || /^\d+$/.test(p))) return { className, label }
  }
  return { className: null, label: inner }
}

/** Splits text into plain runs and {symbol} tokens. */
export function tokenize(text: string): ManaToken[] {
  const tokens: ManaToken[] = []
  let last = 0
  for (const m of text.matchAll(/\{([^}]+)\}/g)) {
    if (m.index > last) tokens.push({ kind: 'text', text: text.slice(last, m.index) })
    tokens.push({ kind: 'symbol', raw: m[0], ...describeSymbol(m[1]) })
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) })
  return tokens
}

/** "Mana cost: 2 generic, white, blue" (split cards: "... // ..."). */
export function manaCostLabel(cost: string): string {
  const halves = cost.split('//').map((half) =>
    tokenize(half)
      .flatMap((t) => (t.kind === 'symbol' ? [t.label] : []))
      .join(', '),
  )
  return halves.filter(Boolean).join(' // ') || 'no mana cost'
}
