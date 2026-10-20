import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CardsContext, type CardsState } from '../data/cardsContext'
import { buildCardDb } from '../data/loadCards'
import { SetIcon } from './SetIcon'

const ready: CardsState = {
  status: 'ready',
  db: buildCardDb(
    {
      fetchedAt: '',
      sets: [
        {
          code: 'war',
          name: 'War of the Spark',
          releasedAt: '2019-05-03',
          cardCount: 0,
          iconSvgUri: '',
          file: 'sets/war.json',
          icon: 'sets/war.svg',
        },
      ],
    },
    [],
  ),
}

const renderIcon = (state: CardsState, code: string) =>
  render(
    <CardsContext.Provider value={state}>
      <SetIcon code={code} name="War of the Spark" />
    </CardsContext.Provider>,
  )

test('draws the self-hosted icon with a spoken label', () => {
  renderIcon(ready, 'war')
  const icon = screen.getByRole('img', { name: 'War of the Spark set symbol' })
  expect(icon.style.getPropertyValue('--set-icon')).toBe('url("/data/sets/war.svg")')
})

test('renders nothing for unknown sets or before data loads', () => {
  expect(renderIcon(ready, 'xyz').container).toBeEmptyDOMElement()
  expect(renderIcon({ status: 'loading' }, 'war').container).toBeEmptyDOMElement()
})

test('a decorative icon is hidden from screen readers and keeps its class', () => {
  const { container } = render(
    <CardsContext.Provider value={ready}>
      <SetIcon code="war" name="War of the Spark" decorative className="rarity-gem" />
    </CardsContext.Provider>,
  )
  expect(screen.queryByRole('img')).toBeNull()
  const icon = container.querySelector('.set-icon.rarity-gem')!
  expect(icon.getAttribute('aria-hidden')).toBe('true')
  expect(icon.getAttribute('title')).toBeNull()
})
