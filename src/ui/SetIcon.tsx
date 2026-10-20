import type { CSSProperties } from 'react'
import { useCards } from '../data/cardsContext'

interface Props {
  code: string
  name: string
  /** Hidden from screen readers, for when nearby text already says what it means. */
  decorative?: boolean
  className?: string
}

/** Set symbol drawn as a CSS mask so it takes the text color (Scryfall SVGs are black). */
export function SetIcon({ code, name, decorative, className }: Props) {
  const state = useCards()
  const entry =
    state.status === 'ready' ? state.db.manifest.sets.find((s) => s.code === code) : undefined
  if (!entry?.icon) return null
  const src = `${import.meta.env.BASE_URL}data/${entry.icon}`
  return (
    <span
      className={className ? `set-icon ${className}` : 'set-icon'}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': `${name} set symbol`, title: name })}
      style={{ '--set-icon': `url("${src}")` } as CSSProperties}
    />
  )
}
