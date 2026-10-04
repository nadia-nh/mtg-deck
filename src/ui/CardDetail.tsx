import { useEffect, useRef } from 'react'
import type { Card, CardFace, Legality } from '../domain/card'
import type { Zone } from '../domain/deck'

const FORMATS: [key: string, label: string][] = [
  ['standard', 'Standard'],
  ['pioneer', 'Pioneer'],
  ['modern', 'Modern'],
  ['legacy', 'Legacy'],
  ['vintage', 'Vintage'],
  ['commander', 'Commander'],
  ['pauper', 'Pauper'],
]

const LEGALITY_LABEL: Record<Legality, string> = {
  legal: 'Legal',
  not_legal: 'Not legal',
  banned: 'Banned',
  restricted: 'Restricted',
}

const usd = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)

type FaceFields = Pick<
  CardFace,
  'name' | 'manaCost' | 'typeLine' | 'oracleText' | 'power' | 'toughness' | 'loyalty'
>

/** One face's rules text. Multi-face cards show a name + cost line per face. */
function FaceText({ face, showName }: { face: FaceFields; showName: boolean }) {
  const stats =
    face.power != null
      ? `${face.power}/${face.toughness}`
      : face.loyalty
        ? `Loyalty ${face.loyalty}`
        : null
  return (
    <div className="face-text">
      {showName && (
        <p className="face-head">
          <strong>{face.name}</strong>{' '}
          {face.manaCost && <span className="mana">{face.manaCost}</span>}
        </p>
      )}
      <p className="type-line">{face.typeLine}</p>
      {face.oracleText && <p className="oracle">{face.oracleText}</p>}
      {stats && <p className="stats">{stats}</p>}
    </div>
  )
}

interface Props {
  card: Card | null
  pricesAsOf: string
  onClose: () => void
  /** Copies of this card currently in the active deck, per zone. */
  inDeck?: { main: number; side: number }
  onAdd?: (zone: Zone) => void
}

export function CardDetail({ card, pricesAsOf, onClose, inDeck, onAdd }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (card && !dialog.open) dialog.showModal()
    if (!card && dialog.open) dialog.close()
  }, [card])

  const images = card?.faces?.some((f) => f.images)
    ? card.faces.flatMap((f) => (f.images ? [{ name: f.name, src: f.images.normal }] : []))
    : card?.images
      ? [{ name: card.name, src: card.images.normal }]
      : []

  return (
    <dialog
      ref={ref}
      className="card-detail"
      aria-labelledby="card-detail-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()} // backdrop click
    >
      {card && (
        <div className="detail-body">
          <header className="detail-header">
            <h2 id="card-detail-title">
              {card.name}{' '}
              {!card.faces && card.manaCost && <span className="mana">{card.manaCost}</span>}
            </h2>
            <button type="button" className="close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          <div className="detail-images">
            {images.map((img) => (
              <img key={img.src} src={img.src} alt={img.name} width={488} height={680} />
            ))}
          </div>
          <div className="detail-info">
            {card.faces ? (
              card.faces.map((f) => <FaceText key={f.name} face={f} showName />)
            ) : (
              <FaceText face={card} showName={false} />
            )}

            <p className="meta">
              {card.setName} · #{card.collectorNumber} ·{' '}
              <span className="rarity">{card.rarity}</span>
            </p>

            {onAdd && (
              <div className="detail-actions">
                <button type="button" className="primary" onClick={() => onAdd('main')}>
                  Add to main deck{inDeck?.main ? ` (${inDeck.main})` : ''}
                </button>
                <button type="button" onClick={() => onAdd('side')}>
                  Add to sideboard{inDeck?.side ? ` (${inDeck.side})` : ''}
                </button>
              </div>
            )}

            <section aria-label="Price">
              <p>
                <strong>{usd(card.prices.usd)}</strong>
                {card.prices.usdFoil != null && <> · foil {usd(card.prices.usdFoil)}</>}{' '}
                <span className="muted">
                  TCGplayer market, as of {new Date(pricesAsOf).toLocaleDateString()}
                </span>
              </p>
            </section>

            <table className="legalities">
              <caption>Format legality</caption>
              <tbody>
                {FORMATS.map(([key, label]) => {
                  const status = card.legalities[key] ?? 'not_legal'
                  return (
                    <tr key={key}>
                      <th scope="row">{label}</th>
                      <td className={`legality legality-${status}`}>{LEGALITY_LABEL[status]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <p className="links">
              <a href={card.scryfallUri} target="_blank" rel="noreferrer">
                View on Scryfall
              </a>
              {card.tcgplayerId != null && (
                <a
                  href={`https://www.tcgplayer.com/product/${card.tcgplayerId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy on TCGplayer
                </a>
              )}
            </p>
          </div>
        </div>
      )}
    </dialog>
  )
}
