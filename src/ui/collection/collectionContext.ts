import { createContext, useContext } from 'react'
import type { Owned } from '../../domain/collection'

export interface CollectionActions {
  owned: Owned
  /** Copies of a card name owned (0 if none). */
  ownedCount(name: string): number
  setOwnedCount(name: string, n: number): void
  /** False when the browser refused the last save. */
  storageOk: boolean
}

export const CollectionContext = createContext<CollectionActions | null>(null)

export function useCollection(): CollectionActions {
  const ctx = useContext(CollectionContext)
  if (!ctx) throw new Error('useCollection must be used inside <CollectionProvider>')
  return ctx
}
