import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { nextTabIndex } from './tabKeys'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

/**
 * WAI-ARIA tabs with automatic activation: arrow keys move focus and select, only the
 * selected tab is in the Tab order. Hidden panels stay mounted so their state (e.g. a
 * half-pasted decklist) survives switching tabs.
 */
export function Tabs({
  label,
  tabs,
  className,
}: {
  label: string
  tabs: Tab[]
  className?: string
}) {
  const [selected, setSelected] = useState(0)
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const current = Math.min(selected, tabs.length - 1)

  const onKeyDown = (e: KeyboardEvent) => {
    const next = nextTabIndex(e.key, current, tabs.length)
    if (next == null) return
    e.preventDefault()
    setSelected(next)
    tabRefs.current[next]?.focus()
  }

  const tabId = (i: number) => `${baseId}-tab-${tabs[i].id}`
  const panelId = (i: number) => `${baseId}-panel-${tabs[i].id}`

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="tablist" onKeyDown={onKeyDown}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            aria-selected={i === current}
            aria-controls={panelId(i)}
            tabIndex={i === current ? 0 : -1}
            onClick={() => setSelected(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={panelId(i)}
          aria-labelledby={tabId(i)}
          tabIndex={0}
          hidden={i !== current}
          className="tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
