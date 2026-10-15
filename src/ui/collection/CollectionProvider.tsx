import { useMemo, useState, type ReactNode } from 'react'
import { setOwned, type Owned } from '../../domain/collection'
import { createCollectionStore, type CollectionStore } from '../../storage/collection'
import { CollectionContext, type CollectionActions } from './collectionContext'

/** The owned-cards collection, persisted per browser. */
export function CollectionProvider({
  children,
  store: storeProp,
}: {
  children: ReactNode
  store?: CollectionStore
}) {
  const [store] = useState(() => storeProp ?? createCollectionStore())
  const [owned, setOwnedState] = useState<Owned>(() => store.get())
  const [storageOk, setStorageOk] = useState(true)

  const value = useMemo<CollectionActions>(
    () => ({
      owned,
      storageOk,
      ownedCount: (name) => owned[name] ?? 0,
      setOwnedCount(name, n) {
        const next = setOwned(store.get(), name, n)
        store.save(next)
        setOwnedState(next)
        setStorageOk(store.lastWriteOk)
      },
    }),
    [owned, storageOk, store],
  )

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
}
