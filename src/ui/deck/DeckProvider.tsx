import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCards } from '../../data/cardsContext'
import { findByName } from '../../data/loadCards'
import * as D from '../../domain/deck'
import { DEFAULT_FORMAT_ID, getFormat } from '../../domain/formats/registry'
import { copiesLeft } from '../../domain/formats/types'
import {
  addedMessage,
  movedMessage,
  popChange,
  pushChange,
  removedMessage,
  restoreCards,
  type Change,
} from '../../domain/history'
import { createDeckStore, type DeckStore } from '../../storage/decks'
import { DeckContext, type CopyAllowance, type DeckActions } from './deckContext'

const DEFAULT_NAME = 'Untitled deck'

/** Ensures there is always at least one deck and a valid active id. */
function initialize(store: DeckStore): string {
  let decks = store.list()
  if (decks.length === 0) {
    store.save(D.createDeck(DEFAULT_NAME, DEFAULT_FORMAT_ID))
    decks = store.list()
  }
  const saved = store.getActiveId()
  const id = saved && store.get(saved) ? saved : decks[0].id
  store.setActiveId(id)
  return id
}

export function DeckProvider({
  children,
  store: storeProp,
}: {
  children: ReactNode
  store?: DeckStore
}) {
  const [store] = useState(() => storeProp ?? createDeckStore())
  const [activeId, setActiveId] = useState(() => initialize(store))
  const [decks, setDecks] = useState(() => store.list())
  const [storageOk, setStorageOk] = useState(true)
  const [history, setHistory] = useState<Change[]>([])
  /** The change the toast is offering to undo (cleared on undo or dismiss). */
  const [lastChange, setLastChange] = useState<Change | null>(null)
  const nextChangeId = useRef(1)
  const cards = useCards()

  const record = useCallback((change: Omit<Change, 'id'>) => {
    const full = { ...change, id: nextChangeId.current++ }
    setHistory((h) => pushChange(h, full))
    setLastChange(full)
  }, [])

  const allowance = useCallback(
    (deck: D.Deck, name: string): CopyAllowance => {
      const card = cards.status === 'ready' ? findByName(cards.db, name) : undefined
      const format = getFormat(deck.formatId)
      if (!card) return { limit: Infinity, left: Infinity, formatName: format.name }
      return {
        limit: format.copyLimit(card),
        left: copiesLeft(deck, format, card),
        formatName: format.name,
      }
    },
    [cards],
  )

  const refresh = useCallback(() => {
    setDecks(store.list())
    setStorageOk(store.lastWriteOk)
  }, [store])

  const activate = useCallback(
    (id: string) => {
      store.setActiveId(id)
      setActiveId(id)
    },
    [store],
  )

  const active = decks.find((d) => d.id === activeId) ?? decks[0]

  /** Apply a pure edit to the active deck and persist it; with a message, it can be undone. */
  const edit = useCallback(
    (fn: (deck: D.Deck) => D.Deck, message?: string) => {
      const current = store.get(activeId)
      if (!current) return
      const next = fn(current)
      if (next !== current) {
        const saved = store.save(next)
        if (message) record({ message, before: current, after: saved, activeBefore: activeId })
        refresh()
      }
    },
    [store, activeId, refresh, record],
  )

  /** Reverts the newest recorded change (see `Change` for the three kinds). */
  const undo = useCallback(() => {
    const [change, rest] = popChange(history)
    if (!change) return
    if (!change.before && change.after) {
      store.remove(change.after.id) // undo a create
    } else if (change.before && !change.after) {
      store.save(change.before) // undo a delete
      if (change.alsoCreated) store.remove(change.alsoCreated)
    } else if (change.before) {
      const current = store.get(change.before.id)
      if (current) store.save(restoreCards(current, change.before))
    }
    const back = change.activeBefore && store.get(change.activeBefore)
    activate(back ? back.id : store.list()[0].id)
    setHistory(rest)
    setLastChange(null)
    refresh()
  }, [history, store, activate, refresh])

  const value = useMemo<DeckActions>(
    () => ({
      decks,
      active,
      storageOk,
      lastChange,
      undo,
      dismissChange: () => setLastChange(null),
      select: activate,
      create(name = DEFAULT_NAME, formatId = active?.formatId ?? DEFAULT_FORMAT_ID, cards) {
        const blank = D.createDeck(name, formatId)
        const deck = store.save(
          cards ? { ...blank, main: { ...cards.main }, side: { ...cards.side } } : blank,
        )
        // A deck created with cards is an import, which can be undone; a blank one can't.
        if (cards) {
          record({
            message: `Imported ${deck.name}`,
            before: null,
            after: deck,
            activeBefore: activeId,
          })
        }
        refresh()
        activate(deck.id)
        return deck
      },
      deleteDeck(id) {
        const deleted = store.get(id)
        store.remove(id)
        let blankId: string | undefined
        if (store.list().length === 0) {
          blankId = store.save(D.createDeck(DEFAULT_NAME, DEFAULT_FORMAT_ID)).id
        }
        if (deleted) {
          record({
            message: `Deleted ${deleted.name}`,
            before: deleted,
            after: null,
            activeBefore: activeId,
            alsoCreated: blankId,
          })
        }
        if (id === activeId) activate(store.list()[0].id)
        refresh()
      },
      duplicate(id) {
        const copy = store.duplicate(id)
        refresh()
        if (copy) activate(copy.id)
      },
      rename: (name) => edit((d) => ({ ...d, name: name.trim() || DEFAULT_NAME })),
      setFormat: (formatId) => edit((d) => ({ ...d, formatId })),
      copyAllowance: (name) => allowance(active, name),
      addCard(zone, name, n = 1) {
        const current = store.get(activeId)
        const fits = current ? Math.min(n, allowance(current, name).left) : 0
        if (fits > 0) edit((d) => D.addCard(d, zone, name, fits), addedMessage(name, fits, zone))
      },
      removeCard(zone, name, n = 1) {
        const removed = Math.min(n, store.get(activeId)?.[zone][name] ?? 0)
        if (removed > 0) {
          edit((d) => D.removeCard(d, zone, name, removed), removedMessage(name, removed, zone))
        }
      },
      setCount: (zone, name, qty) =>
        edit((d) => {
          const max = (d[zone][name] ?? 0) + allowance(d, name).left
          return D.setCount(d, zone, name, Math.min(qty, max))
        }),
      moveCard(from, to, name, n = 1) {
        const moved = Math.min(n, store.get(activeId)?.[from][name] ?? 0)
        if (moved > 0) {
          edit((d) => D.moveCard(d, from, to, name, moved), movedMessage(name, moved, to))
        }
      },
      replaceCards(main, side) {
        const count = [...Object.values(main), ...Object.values(side)].reduce((a, b) => a + b, 0)
        edit(
          (d) => ({ ...d, main: { ...main }, side: { ...side } }),
          `Imported ${count} ${count === 1 ? 'card' : 'cards'}`,
        )
      },
    }),
    [
      decks,
      active,
      storageOk,
      lastChange,
      undo,
      activate,
      store,
      refresh,
      activeId,
      edit,
      allowance,
      record,
    ],
  )

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}
