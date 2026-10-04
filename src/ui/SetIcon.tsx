import type { CSSProperties } from 'react'
import { useCards } from '../data/cardsContext'

/** Set symbol drawn as a CSS mask so it takes the text color (Scryfall SVGs are black). */
export function SetIcon({ code, name }: { code: string; name: string }) {
  const state = useCards()
  const entry =
    state.status === 'ready' ? state.db.manifest.sets.find((s) => s.code === code) : undefined
  if (!entry?.icon) return null
  const src = `${import.meta.env.BASE_URL}data/${entry.icon}`
  return (
    <span
      className="set-icon"
      role="img"
      aria-label={`${name} set symbol`}
      title={name}
      style={{ '--set-icon': `url("${src}")` } as CSSProperties}
    />
  )
}
