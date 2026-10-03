import { createContext, useContext } from 'react'
import type { CardDb } from './loadCards'

export type CardsState =
  { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; db: CardDb }

export const CardsContext = createContext<CardsState>({ status: 'loading' })

export const useCards = () => useContext(CardsContext)
