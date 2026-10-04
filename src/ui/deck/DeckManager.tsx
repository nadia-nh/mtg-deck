import { useState } from 'react'
import { useDeck } from './deckContext'

/** Pick, create, rename, duplicate, and delete decks. */
export function DeckManager() {
  const { decks, active, select, create, rename, duplicate, deleteDeck } = useDeck()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Local draft so typing doesn't save on every keystroke.
  const [draftName, setDraftName] = useState<string | null>(null)

  const commitName = () => {
    if (draftName != null && draftName !== active.name) rename(draftName)
    setDraftName(null)
  }

  return (
    <section className="deck-manager" aria-label="Decks">
      <label className="field">
        <span>Deck</span>
        <select
          value={active.id}
          onChange={(e) => {
            setConfirmingDelete(false)
            setDraftName(null)
            select(e.target.value)
          }}
        >
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Name</span>
        <input
          value={draftName ?? active.name}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setDraftName(null)
          }}
        />
      </label>

      {confirmingDelete ? (
        <div className="manager-actions" role="group" aria-label="Confirm delete">
          <span>Delete “{active.name}”?</span>
          <button
            type="button"
            className="danger"
            onClick={() => {
              deleteDeck(active.id)
              setConfirmingDelete(false)
            }}
          >
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="manager-actions">
          <button type="button" onClick={() => create()}>
            New deck
          </button>
          <button type="button" onClick={() => duplicate(active.id)}>
            Duplicate
          </button>
          <button type="button" onClick={() => setConfirmingDelete(true)}>
            Delete…
          </button>
        </div>
      )}
    </section>
  )
}
