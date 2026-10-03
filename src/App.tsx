import { CardsProvider } from './data/CardsProvider'
import { useCards } from './data/cardsContext'

function DataStatus() {
  const state = useCards()
  if (state.status === 'loading') return <p>Loading cards…</p>
  if (state.status === 'error') return <p role="alert">Couldn’t load card data: {state.error}</p>
  const { cards, manifest } = state.db
  const n = manifest.sets.length
  return (
    <p data-testid="data-status">
      Loaded {cards.length} cards from {n} {n === 1 ? 'set' : 'sets'} (
      {manifest.sets.map((s) => s.name).join(', ')}). Prices as of{' '}
      {new Date(manifest.fetchedAt).toLocaleDateString()}.
    </p>
  )
}

export default function App({ load }: { load?: Parameters<typeof CardsProvider>[0]['load'] }) {
  return (
    <CardsProvider load={load}>
      <main>
        <h1>MTG Deck Builder</h1>
        <DataStatus />
      </main>
    </CardsProvider>
  )
}
