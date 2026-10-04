import { useMemo } from 'react'
import type { ResolveCard } from '../../domain/deck'
import { FORMATS, getFormat } from '../../domain/formats/registry'
import { hasErrors } from '../../domain/formats/types'
import { useDeck } from './deckContext'

export function DeckValidation({ resolve }: { resolve: ResolveCard }) {
  const { active, setFormat } = useDeck()
  const format = getFormat(active.formatId)
  const issues = useMemo(() => {
    const all = format.validate(active, resolve)
    // Errors first, then warnings.
    return [...all].sort((a, b) =>
      a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1,
    )
  }, [format, active, resolve])
  const valid = !hasErrors(issues)
  const errorCount = issues.filter((i) => i.severity === 'error').length

  return (
    <section className="deck-validation" aria-label="Deck validation">
      <label className="field">
        <span>Format</span>
        <select value={format.id} onChange={(e) => setFormat(e.target.value)}>
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <p className={`validity ${valid ? 'ok' : 'bad'}`} role="status" data-testid="validity">
        {valid
          ? `✓ Valid for ${format.name}`
          : `✗ ${errorCount} ${errorCount === 1 ? 'problem' : 'problems'} for ${format.name}`}
      </p>
      {issues.length > 0 && (
        // Capped height and scrollable, so focusable for keyboard scrolling.
        <ul className="issues" tabIndex={0} aria-label="Deck problems">
          {issues.map((issue) => (
            <li key={`${issue.code}:${issue.cardName ?? ''}`} className={issue.severity}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
