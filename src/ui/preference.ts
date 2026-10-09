/**
 * A remembered choice from a fixed list (e.g. the deck view's grouping), kept per browser.
 * Storage that is blocked, full or holding junk falls back to the default.
 */
type KV = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): KV | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadChoice<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  storage: KV | null = defaultStorage(),
): T {
  try {
    const v = storage?.getItem(key)
    return allowed.includes(v as T) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

export function saveChoice(key: string, value: string, storage: KV | null = defaultStorage()) {
  try {
    storage?.setItem(key, value)
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
}
