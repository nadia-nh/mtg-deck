import { useRef, useState } from 'react'
import { isLand } from '../../domain/card'
import { zoneTotal, type ResolveCard } from '../../domain/deck'
import {
  HAND_SIZE,
  deckCards,
  drawCard,
  mulligan,
  newHand,
  putOnBottom,
  seededRng,
  type HandState,
  type Rng,
} from '../../domain/sampleHand'
import { useDeck } from './deckContext'

/** `?seed=N` makes the shuffles repeatable (used by the e2e tests); otherwise Math.random. */
function makeRng(): Rng {
  const seed = Number(new URLSearchParams(window.location.search).get('seed'))
  return Number.isInteger(seed) && seed !== 0 ? seededRng(seed) : Math.random
}

/** "Draw sample hand" button plus the dialog for goldfishing opening hands. */
export function SampleHand({ resolve }: { resolve: ResolveCard }) {
  const { active } = useDeck()
  const dialog = useRef<HTMLDialogElement>(null)
  const rng = useRef<Rng | null>(null)
  const [state, setState] = useState<HandState | null>(null)
  const enough = zoneTotal(active, 'main') >= HAND_SIZE

  const random = () => (rng.current ??= makeRng())
  const open = () => {
    setState(newHand(deckCards(active), random()))
    dialog.current?.showModal()
  }

  const lands = state?.hand.filter((name) => {
    const card = resolve(name)
    return card ? isLand(card) : false
  }).length

  return (
    <>
      <button type="button" className="btn sample-hand-open" disabled={!enough} onClick={open}>
        Draw sample hand
      </button>
      {!enough && <span className="muted sample-hand-hint"> (needs 7 cards)</span>}

      <dialog
        ref={dialog}
        className="sample-hand"
        aria-labelledby="sample-hand-title"
        onClose={() => setState(null)}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        {state && (
          <div className="sample-hand-body">
            <header className="sample-hand-header">
              <h2 id="sample-hand-title">
                Sample hand
                {state.mulligans > 0 && (
                  <span className="muted"> · mulligan to {HAND_SIZE - state.mulligans}</span>
                )}
              </h2>
              <button
                type="button"
                className="close"
                aria-label="Close"
                onClick={() => dialog.current?.close()}
              >
                ×
              </button>
            </header>

            <p className="sample-hand-summary" role="status">
              {state.toBottom > 0
                ? `Choose ${state.toBottom} ${state.toBottom === 1 ? 'card' : 'cards'} to put on the bottom.`
                : `${lands} ${lands === 1 ? 'land' : 'lands'} · ${state.hand.length - lands!} ${
                    state.hand.length - lands! === 1 ? 'spell' : 'spells'
                  } · ${state.library.length} in library`}
            </p>

            <ul className="sample-hand-cards" aria-label="Hand">
              {state.hand.map((name, i) => {
                const card = resolve(name)
                const image = card?.images ? (
                  <img src={card.images.normal} alt={name} width={488} height={680} />
                ) : (
                  <span className="card-placeholder">{name}</span>
                )
                return (
                  // Duplicates are normal (four Lava Coil), so the position is part of the key.
                  <li key={`${i}:${name}`}>
                    {state.toBottom > 0 ? (
                      <button
                        type="button"
                        className="card-tile"
                        aria-label={`Put ${name} on the bottom`}
                        onClick={() => setState(putOnBottom(state, i))}
                      >
                        {image}
                      </button>
                    ) : (
                      image
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="detail-actions">
              <button
                type="button"
                className="primary"
                onClick={() => setState(newHand(deckCards(active), random()))}
              >
                New hand
              </button>
              <button
                type="button"
                disabled={state.mulligans >= HAND_SIZE - 1}
                onClick={() => setState(mulligan(state, random()))}
              >
                Mulligan
              </button>
              <button
                type="button"
                disabled={state.toBottom > 0 || state.library.length === 0}
                onClick={() => setState(drawCard(state))}
              >
                Draw a card
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
