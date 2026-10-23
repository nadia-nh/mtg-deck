import { useEffect, useState, type ReactNode } from 'react'
import { CardsContext, type CardsState } from './cardsContext'
import { loadCards, type CardDb, type OnPartial } from './loadCards'

export function CardsProvider({
  children,
  load = loadCards,
}: {
  children: ReactNode
  /** Injectable for tests. Calls `onPartial` with the initial sets, resolves with all of them. */
  load?: (onPartial?: OnPartial) => Promise<CardDb>
}) {
  const [state, setState] = useState<CardsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    load((db) => !cancelled && setState({ status: 'ready', db, loadingMore: true }))
      .then((db) => !cancelled && setState({ status: 'ready', db }))
      .catch((e: unknown) => {
        if (cancelled) return
        // If the initial sets already show, keep them and just report the older ones.
        setState((cur) =>
          cur.status === 'ready'
            ? { status: 'ready', db: cur.db, moreError: String(e) }
            : { status: 'error', error: String(e) },
        )
      })
    return () => {
      cancelled = true
    }
  }, [load])

  return <CardsContext.Provider value={state}>{children}</CardsContext.Provider>
}
