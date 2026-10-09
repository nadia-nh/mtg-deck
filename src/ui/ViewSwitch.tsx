import type { MouseEvent, ReactNode } from 'react'
import { DeckIcon, LargeGridIcon } from './icons'
import { viewUrl, type View } from './view'

const OPTIONS: { value: View; label: string; icon: ReactNode }[] = [
  { value: 'browse', label: 'Browse', icon: <LargeGridIcon /> },
  { value: 'deck', label: 'Deck', icon: <DeckIcon /> },
]

/** Header links between the card browser and the deck view (real links: new tab works). */
export function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const follow = (e: MouseEvent, target: View) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onChange(target)
  }
  return (
    <nav className="segmented view-switch" aria-label="Main view">
      {OPTIONS.map((o) => (
        <a
          key={o.value}
          href={viewUrl(o.value, window.location.pathname, window.location.search)}
          aria-current={view === o.value ? 'page' : undefined}
          title={o.label}
          onClick={(e) => follow(e, o.value)}
        >
          {o.icon}
          <span className="segmented-label">{o.label}</span>
        </a>
      ))}
    </nav>
  )
}
