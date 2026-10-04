import type { ReactNode } from 'react'
import type { Density } from './density'
import { LargeGridIcon, SmallGridIcon } from './icons'

const OPTIONS: { value: Density; label: string; icon: ReactNode }[] = [
  { value: 'large', label: 'Large cards', icon: <LargeGridIcon /> },
  { value: 'small', label: 'Small cards', icon: <SmallGridIcon /> },
]

/** Icon-only segmented control that switches how results are shown. */
export function DensityToggle({
  value,
  onChange,
}: {
  value: Density
  onChange: (d: Density) => void
}) {
  return (
    <fieldset className="segmented icon-only" aria-label="View">
      {OPTIONS.map((o) => (
        <label key={o.value} title={o.label}>
          <input
            type="radio"
            name="density"
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.icon}
          <span className="segmented-label">{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
