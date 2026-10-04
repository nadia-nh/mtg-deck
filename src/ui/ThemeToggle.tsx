import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { MonitorIcon, MoonIcon, SunIcon } from './icons'
import { applyTheme, loadThemePref, saveThemePref, type ThemePref } from './theme'

const OPTIONS: { value: ThemePref; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'System', icon: <MonitorIcon /> },
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
]

/** Three-way segmented control: System / Light / Dark. */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(loadThemePref)

  useEffect(() => {
    applyTheme(pref)
    saveThemePref(pref)
  }, [pref])

  return (
    <fieldset className="segmented" aria-label="Theme">
      {OPTIONS.map((o) => (
        <label key={o.value} title={`${o.label} theme`}>
          <input
            type="radio"
            name="theme"
            value={o.value}
            checked={pref === o.value}
            onChange={() => setPref(o.value)}
          />
          {o.icon}
          <span className="segmented-label">{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
