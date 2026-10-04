export interface SetEntry {
  code: string
  name: string
  releasedAt: string
  cardCount: number
  iconSvgUri: string
  /** Path relative to the data directory, e.g. "sets/grn.json". */
  file: string
  /** Self-hosted set symbol, relative to the data directory, e.g. "sets/grn.svg". */
  icon: string
}

export interface SetManifest {
  /** ISO timestamp of the snapshot; prices are "as of" this time. */
  fetchedAt: string
  sets: SetEntry[]
}
