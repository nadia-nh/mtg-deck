import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const LANDS = new Set(['Sacred Foundry', 'Boros Guildgate', 'Mountain', 'Plains'])

test.use({ viewport: { width: 1440, height: 900 } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const deck = {
      id: 'boros',
      name: 'Boros Aggro',
      formatId: 'pioneer',
      createdAt: '2026-10-04T00:00:00Z',
      updatedAt: '2026-10-04T00:00:00Z',
      main: {
        'Boros Challenger': 4,
        'Legion Warboss': 4,
        'Skyknight Legionnaire': 4,
        'Light of the Legion': 2,
        'Lava Coil': 4,
        'Conclave Tribunal': 4,
        'Sure Strike': 4,
        'Sacred Foundry': 4,
        'Boros Guildgate': 4,
        Mountain: 13,
        Plains: 13,
      },
      side: {},
    }
    localStorage.setItem('mtg-deck-builder:decks', JSON.stringify({ version: 1, decks: [deck] }))
    localStorage.setItem('mtg-deck-builder:active-deck', deck.id)
  })
})

const openHand = async (page: Page, seed = 42) => {
  await page.goto(`/?seed=${seed}`)
  await page.getByRole('button', { name: 'Draw sample hand' }).click()
  const dialog = page.getByRole('dialog', { name: /Sample hand/ })
  await expect(dialog).toBeVisible()
  return dialog
}
const handNames = (dialog: ReturnType<Page['getByRole']>) =>
  dialog
    .getByRole('list', { name: 'Hand' })
    .getByRole('img')
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt')!))

test('draws seven cards with a land count that matches the cards shown', async ({ page }) => {
  const dialog = await openHand(page)
  const names = await handNames(dialog)
  expect(names).toHaveLength(7)
  const lands = names.filter((n) => LANDS.has(n)).length
  await expect(dialog.getByRole('status')).toHaveText(
    `${lands} ${lands === 1 ? 'land' : 'lands'} · ${7 - lands} ${7 - lands === 1 ? 'spell' : 'spells'} · 53 in library`,
  )
})

test('the same seed draws the same hand', async ({ page }) => {
  const first = await handNames(await openHand(page, 7))
  const again = await handNames(await openHand(page, 7))
  expect(again).toEqual(first)
})

test('London mulligan: redraw seven, bottom one, then draw', async ({ page }) => {
  const dialog = await openHand(page)
  await dialog.getByRole('button', { name: 'Mulligan' }).click()
  await expect(dialog.getByRole('heading')).toContainText('mulligan to 6')
  await expect(dialog.getByRole('status')).toHaveText('Choose 1 card to put on the bottom.')
  await expect(dialog.getByRole('button', { name: 'Draw a card' })).toBeDisabled()

  await dialog
    .getByRole('button', { name: /^Put .+ on the bottom$/ })
    .first()
    .click()
  expect(await handNames(dialog)).toHaveLength(6)
  await expect(dialog.getByRole('status')).toContainText('· 54 in library')

  await dialog.getByRole('button', { name: 'Draw a card' }).click()
  expect(await handNames(dialog)).toHaveLength(7)
  await expect(dialog.getByRole('status')).toContainText('· 53 in library')

  await dialog.getByRole('button', { name: 'New hand' }).click()
  await expect(dialog.getByRole('heading')).not.toContainText('mulligan')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('needs at least seven cards', async ({ page }) => {
  await page.goto('/')
  await page.locator('.deck-panel').getByRole('button', { name: 'New deck' }).click()
  await expect(page.getByRole('button', { name: 'Draw sample hand' })).toBeDisabled()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`sample hand dialog has no accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    const dialog = await openHand(page)
    await dialog.getByRole('button', { name: 'Mulligan' }).click() // include the bottom buttons
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.sample-hand')
      .analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}
