import { expect, test } from '@playwright/test'
import { manifest, totalCards } from './manifest'

test('loads every set in the data snapshot', async ({ page }) => {
  await page.goto('/')
  const n = manifest.sets.length
  const status = page.getByTestId('data-status')
  await expect(status).toContainText(
    `Loaded ${totalCards.toLocaleString('en-US')} cards from ${n} ${n === 1 ? 'set' : 'sets'}`,
  )
  await expect(status).not.toContainText('Loading')
  // A long list is named by its range: oldest to newest.
  await expect(status).toContainText(`${manifest.sets.at(-1)!.name} to ${manifest.sets[0].name}`)
})

test('shows the initial sets first, then loads the older ones in the background', async ({
  page,
}) => {
  const initial = manifest.sets.filter((s) => !s.background)
  const background = manifest.sets.filter((s) => s.background)
  test.skip(background.length === 0, 'no background sets configured')

  // Hold back one older set so the in-between state can be seen.
  const held = background[0]
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => (release = r))
  await page.route(`**/data/${held.file}`, async (route) => {
    await gate
    await route.continue()
  })

  await page.goto('/')
  const note = page.getByTestId('results-note')
  await expect(note).toHaveText('Loading older sets…')
  await expect(page.getByTestId('data-status')).toContainText(
    `from ${initial.length} ${initial.length === 1 ? 'set' : 'sets'}`,
  )
  // Cards from the initial sets are already usable.
  await expect(page.locator('.card-cell').first()).toBeVisible()

  release()
  await expect(note).toBeEmpty()
  await expect(page.getByTestId('data-status')).toContainText(`from ${manifest.sets.length} sets`)
})

test('a link to an older set waits for it instead of saying nothing matches', async ({ page }) => {
  const older = manifest.sets.find((s) => s.background)
  test.skip(!older, 'no background sets configured')
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => (release = r))
  await page.route(`**/data/${older!.file}`, async (route) => {
    await gate
    await route.continue()
  })
  await page.goto(`/?s=${older!.code}`)
  await expect(page.getByText('Loading older sets…').first()).toBeVisible()
  await expect(page.getByText('No cards match these filters.')).toHaveCount(0)
  release()
  await expect(page.locator('.card-cell').first()).toBeVisible()
})

test('deck cards from an older set wait for it instead of showing as unknown', async ({ page }) => {
  const ths = manifest.sets.find((s) => s.code === 'ths' && s.background)
  test.skip(!ths, 'Theros is not a background set')
  const deck = {
    id: 'd',
    name: 'Test',
    formatId: 'pioneer',
    createdAt: '2026-10-22T00:00:00Z',
    updatedAt: '2026-10-22T00:00:00Z',
    main: { Thoughtseize: 4 },
    side: {},
  }
  await page.addInitScript((d) => {
    localStorage.setItem('mtg-deck-builder:decks', JSON.stringify({ version: 1, decks: [d] }))
    localStorage.setItem('mtg-deck-builder:active-deck', d.id)
  }, deck)
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => (release = r))
  await page.route(`**/data/${ths!.file}`, async (route) => {
    await gate
    await route.continue()
  })

  await page.goto('/')
  const panel = page.locator('.deck-panel')
  await expect(panel.getByRole('heading', { name: /Loading older sets…/ })).toBeVisible()
  await expect(page.locator('.issues')).not.toContainText('isn’t in the loaded card data')

  release()
  await expect(panel.getByRole('heading', { name: /Sorceries \(4\)/ })).toBeVisible()
  await expect(panel.getByRole('heading', { name: /Loading older sets…/ })).toHaveCount(0)
})
