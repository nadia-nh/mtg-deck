import { useState } from 'react'
import type { CardDb } from './data/loadCards'
import type { Card } from './domain/card'
import { CardsProvider } from './data/CardsProvider'
import { useCards } from './data/cardsContext'
import { CardBrowser } from './ui/CardBrowser'
import { CardDetail } from './ui/CardDetail'

function DataStatus({ db }: { db: CardDb }) {
  const { cards, manifest } = db
  const n = manifest.sets.length
  return (
    <p className="data-status" data-testid="data-status">
      Loaded {cards.length} cards from {n} {n === 1 ? 'set' : 'sets'} (
      {manifest.sets.map((s) => s.name).join(', ')}). Prices as of{' '}
      {new Date(manifest.fetchedAt).toLocaleDateString()}.
    </p>
  )
}

function Main() {
  const state = useCards()
  const [selected, setSelected] = useState<Card | null>(null)
  if (state.status === 'loading') return <p>Loading cards…</p>
  if (state.status === 'error') return <p role="alert">Couldn’t load card data: {state.error}</p>
  return (
    <>
      <CardBrowser db={state.db} onSelect={setSelected} />
      <CardDetail
        card={selected}
        pricesAsOf={state.db.manifest.fetchedAt}
        onClose={() => setSelected(null)}
      />
      <footer>
        <DataStatus db={state.db} />
        <p>
          Card data and images from <a href="https://scryfall.com">Scryfall</a>. Magic: The
          Gathering is © Wizards of the Coast; this is unofficial fan content.
        </p>
      </footer>
    </>
  )
}

export default function App({ load }: { load?: () => Promise<CardDb> }) {
  return (
    <CardsProvider load={load}>
      <header className="app-header">
        <h1>MTG Deck Builder</h1>
      </header>
      <main>
        <Main />
      </main>
    </CardsProvider>
  )
}
