import { useEffect, useState, type ReactNode } from 'react'
import { CardsContext, type CardsState } from './cardsContext'
import { loadCards, type CardDb } from './loadCards'

export function CardsProvider({
  children,
  load = loadCards,
}: {
  children: ReactNode
  /** Injectable for tests. */
  load?: () => Promise<CardDb>
}) {
  const [state, setState] = useState<CardsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    load()
      .then((db) => !cancelled && setState({ status: 'ready', db }))
      .catch((e: unknown) => !cancelled && setState({ status: 'error', error: String(e) }))
    return () => {
      cancelled = true
    }
  }, [load])

  return <CardsContext.Provider value={state}>{children}</CardsContext.Provider>
}
