import type { Color } from './card'
import type { CardFilter } from './search'

/** One active filter, as shown in the chips toolbar. */
export interface FilterChip {
  /** Stable React key, e.g. "color:W" or "mv". */
  key: string
  label: string
  /** The filter with just this chip's condition removed. */
  remove(filter: CardFilter): CardFilter
}

export const COLOR_NAMES: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Removes one value from a list field, dropping the field when it becomes empty. */
function without<K extends 'colors' | 'types' | 'rarities' | 'sets'>(key: K, value: string) {
  return (f: CardFilter): CardFilter => {
    const rest = (f[key] as string[] | undefined)?.filter((v) => v !== value) ?? []
    return { ...f, [key]: rest.length ? rest : undefined }
  }
}

const clear =
  (...keys: (keyof CardFilter)[]) =>
  (f: CardFilter): CardFilter => {
    const next = { ...f }
    for (const k of keys) delete next[k]
    return next
  }

function manaValueLabel(min?: number, max?: number): string {
  if (min != null && max != null) return min === max ? `MV ${min}` : `MV ${min}–${max}`
  return min != null ? `MV ≥ ${min}` : `MV ≤ ${max}`
}

/**
 * Lists the active filters as human-readable chips, in the same order as the filter panel.
 * `setName` turns a set code into its display name (falls back to the upper-case code).
 */
export function describeFilter(
  f: CardFilter,
  setName: (code: string) => string | undefined = () => undefined,
): FilterChip[] {
  const chips: FilterChip[] = []
  const text = f.text?.trim()
  if (text) chips.push({ key: 'text', label: `“${text}”`, remove: clear('text') })

  for (const c of f.colors ?? []) {
    chips.push({ key: `color:${c}`, label: COLOR_NAMES[c], remove: without('colors', c) })
  }
  if (f.colorless) chips.push({ key: 'colorless', label: 'Colorless', remove: clear('colorless') })
  if (f.colorMode === 'exact') {
    chips.push({ key: 'exact', label: 'Exactly these colors', remove: clear('colorMode') })
  }
  if (f.multicolor) {
    chips.push({ key: 'multicolor', label: 'Multicolor', remove: clear('multicolor') })
  }
  if (f.guild) chips.push({ key: 'guild', label: capitalize(f.guild), remove: clear('guild') })

  for (const t of f.types ?? []) {
    chips.push({ key: `type:${t}`, label: t, remove: without('types', t) })
  }
  for (const r of f.rarities ?? []) {
    chips.push({ key: `rarity:${r}`, label: capitalize(r), remove: without('rarities', r) })
  }
  if (f.cmcMin != null || f.cmcMax != null) {
    chips.push({
      key: 'mv',
      label: manaValueLabel(f.cmcMin, f.cmcMax),
      remove: clear('cmcMin', 'cmcMax'),
    })
  }
  for (const s of f.sets ?? []) {
    chips.push({
      key: `set:${s}`,
      label: setName(s) ?? s.toUpperCase(),
      remove: without('sets', s),
    })
  }
  if (f.owned) chips.push({ key: 'owned', label: 'Owned', remove: clear('owned') })
  if (f.allPrintings) {
    chips.push({ key: 'printings', label: 'All printings', remove: clear('allPrintings') })
  }
  return chips
}
