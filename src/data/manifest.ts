export interface SetEntry {
  code: string
  name: string
  releasedAt: string
  cardCount: number
  iconSvgUri: string
  /** Path relative to the data directory, e.g. "sets/grn.json". Cards without prices. */
  file: string
  /** The set's prices (see PriceTable), e.g. "sets/grn.prices.json". Absent: no prices. */
  prices?: string
  /** Self-hosted set symbol, relative to the data directory, e.g. "sets/grn.svg". */
  icon: string
  /**
   * Loaded after the app is already showing the other sets (older Pioneer sets), so the
   * first screen doesn't wait for the whole snapshot.
   */
  background?: boolean
}

export interface SetManifest {
  /** ISO timestamp of the snapshot; prices are "as of" this time. */
  fetchedAt: string
  sets: SetEntry[]
}
