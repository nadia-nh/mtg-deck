import { createContext, useContext } from 'react'
import type { CardDb } from './loadCards'

export type CardsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | {
      status: 'ready'
      db: CardDb
      /** Background (older) sets are still loading; `db` has the initial sets only. */
      loadingMore?: boolean
      /** Background sets failed to load; `db` stays usable with the initial sets. */
      moreError?: string
    }

export const CardsContext = createContext<CardsState>({ status: 'loading' })

export const useCards = () => useContext(CardsContext)
