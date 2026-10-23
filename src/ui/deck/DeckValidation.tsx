import { useMemo } from 'react'
import { useCards } from '../../data/cardsContext'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import { FORMATS, getFormat } from '../../domain/formats/registry'
import { deckStatus, IN_PROGRESS_CODE } from '../../domain/formats/types'
import { useDeck } from './deckContext'

export function DeckValidation({ resolve }: { resolve: ResolveCard }) {
  const { active, setFormat } = useDeck()
  const cardsState = useCards()
  const loadingMore = cardsState.status === 'ready' && !!cardsState.loadingMore
  const format = getFormat(active.formatId)
  const issues = useMemo(() => {
    // Cards from older sets can't be checked until those sets arrive; don't warn yet.
    const all = format
      .validate(active, resolve)
      .filter((i) => !(loadingMore && i.code === 'unknown-card'))
    // Errors first, then warnings.
    return [...all].sort((a, b) =>
      a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1,
    )
  }, [format, active, resolve, loadingMore])
  const status = deckStatus(active, issues)
  const errorCount = issues.filter((i) => i.severity === 'error').length
  const main = zoneTotal(active, 'main')
  // While building, the count line says how far along the deck is, so the list skips it.
  const listed =
    status === 'incomplete' ? issues.filter((i) => i.code !== IN_PROGRESS_CODE) : issues

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
      <p className={`validity ${status}`} role="status" data-testid="validity">
        {status === 'empty'
          ? `Add cards to build a ${format.name} deck`
          : status === 'incomplete'
            ? `${main} of ${format.minMainDeck} cards for ${format.name}`
            : status === 'valid'
              ? `✓ Valid for ${format.name}`
              : `✗ ${errorCount} ${errorCount === 1 ? 'problem' : 'problems'} for ${format.name}`}
      </p>
      {status !== 'empty' && listed.length > 0 && (
        // Capped height and scrollable, so focusable for keyboard scrolling.
        <ul className="issues" tabIndex={0} aria-label="Deck problems">
          {listed.map((issue) => (
            <li key={`${issue.code}:${issue.cardName ?? ''}`} className={issue.severity}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
