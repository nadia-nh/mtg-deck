import type { ResolveCard } from '../../domain/deck'
import { useDeck } from './deckContext'

const BASICS = [
  ['Plains', 'W'],
  ['Island', 'U'],
  ['Swamp', 'B'],
  ['Mountain', 'R'],
  ['Forest', 'G'],
] as const

/** Quick-add basics; they're colorless so they're easy to miss in color-filtered searches. */
export function BasicLandButtons({ resolve }: { resolve: ResolveCard }) {
  const { addCard } = useDeck()
  const available = BASICS.filter(([name]) => resolve(name))
  if (available.length === 0) return null
  return (
    <div className="basic-lands" role="group" aria-label="Add basic land">
      <span className="muted">Add basic:</span>
      {available.map(([name, color]) => (
        <button
          key={name}
          type="button"
          className={`pip pip-${color}`}
          aria-label={`Add ${name}`}
          title={name}
          onClick={() => addCard('main', name)}
        >
          {color}
        </button>
      ))}
    </div>
  )
}
