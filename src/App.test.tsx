import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'
import { buildCardDb } from './data/loadCards'
import type { Card } from './domain/card'

test('shows how many cards were loaded', async () => {
  const db = buildCardDb(
    {
      fetchedAt: '2026-10-03T00:00:00Z',
      sets: [
        {
          code: 'grn',
          name: 'Guilds of Ravnica',
          releasedAt: '2018-10-05',
          cardCount: 2,
          iconSvgUri: '',
          file: '',
        },
      ],
    },
    [{ id: '1', name: 'A' } as Card, { id: '2', name: 'B' } as Card],
  )
  const load = () => Promise.resolve(db)
  render(<App load={load} />)
  expect(screen.getByRole('heading', { name: /mtg deck builder/i })).toBeInTheDocument()
  expect(await screen.findByText(/Loaded 2 cards from 1 set/)).toBeInTheDocument()
})

test('shows an error when data fails to load', async () => {
  const load = () => Promise.reject(new Error('boom'))
  render(<App load={load} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})
