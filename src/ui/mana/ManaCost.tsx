import { manaCostLabel, tokenize, type ManaToken } from './symbols'

function Symbol({ token }: { token: Extract<ManaToken, { kind: 'symbol' }> }) {
  if (!token.className) return <span className="mana-fallback">{token.raw}</span>
  return <i className={`ms ms-cost ${token.className}`} aria-hidden="true" />
}

/** A mana cost like {2}{W}{U} drawn with mana symbols; read as one label. */
export function ManaCost({ cost, className = '' }: { cost: string; className?: string }) {
  if (!cost) return null
  return (
    <span
      className={`mana-cost ${className}`}
      role="img"
      aria-label={manaCostLabel(cost)}
      title={cost}
    >
      {tokenize(cost).map((t, i) =>
        t.kind === 'symbol' ? (
          <Symbol key={i} token={t} />
        ) : (
          <span key={i} className="mana-sep" aria-hidden="true">
            {t.text.trim() === '//' ? ' // ' : t.text}
          </span>
        ),
      )}
    </span>
  )
}

/** Rules text with inline symbols ({T}, costs). Each symbol is labeled for screen readers. */
export function RulesText({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((t, i) =>
        t.kind === 'text' ? (
          t.text
        ) : t.className ? (
          <i key={i} className={`ms ms-cost ${t.className}`} role="img" aria-label={t.label} />
        ) : (
          t.raw
        ),
      )}
    </>
  )
}
