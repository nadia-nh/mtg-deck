import type { SetEntry } from '../data/manifest'

export interface SetGroup {
  year: string
  sets: SetEntry[]
}

/** Sets grouped by release year, newest year and newest set first (for the set picker). */
export function groupSetsByYear(sets: readonly SetEntry[]): SetGroup[] {
  const sorted = [...sets].sort(
    (a, b) => b.releasedAt.localeCompare(a.releasedAt) || a.name.localeCompare(b.name),
  )
  const groups: SetGroup[] = []
  for (const set of sorted) {
    const year = set.releasedAt.slice(0, 4)
    const last = groups.at(-1)
    if (last?.year === year) last.sets.push(set)
    else groups.push({ year, sets: [set] })
  }
  return groups
}
