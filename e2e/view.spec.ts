import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('switch to the deck view and back; Back returns; filters survive', async ({ page }) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  const nav = page.getByRole('navigation', { name: 'Main view' })
  await expect(nav.getByRole('link', { name: 'Browse' })).toHaveAttribute('aria-current', 'page')

  await nav.getByRole('link', { name: 'Deck' }).click()
  await expect(page).toHaveURL(/view=deck/)
  await expect(page).toHaveURL(/q=lava/)
  await expect(nav.getByRole('link', { name: 'Deck' })).toHaveAttribute('aria-current', 'page')
  const deckView = page.getByRole('region', { name: /Untitled deck/ })
  await expect(deckView.getByRole('list', { name: 'Main deck (1)' })).toBeVisible()
  await expect(deckView.getByRole('img', { name: 'Lava Coil' })).toBeVisible()
  await expect(page.getByRole('searchbox')).toHaveCount(0) // the browser is gone

  // Back returns to the browser with the same search.
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue('lava coil')
  await expect(page.getByRole('button', { name: 'Add Lava Coil to deck' })).toBeVisible()
  await page.goForward()
  await expect(deckView).toBeVisible()
})

test('deep link opens the deck view; clicking a card opens its details', async ({ page }) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  await page.goto('/?view=deck')
  await expect(page.getByRole('heading', { name: /Untitled deck/ })).toBeVisible()
  await page.locator('.deck-view').getByRole('button', { name: 'Lava Coil' }).click()
  await expect(page.getByRole('dialog', { name: 'Lava Coil' })).toBeVisible()
})

test('an empty deck view points back to the browser', async ({ page }) => {
  await page.goto('/?view=deck')
  await expect(page.locator('.deck-view')).toContainText('This deck is empty.')
  await page.getByRole('button', { name: 'Browse cards' }).click()
  await expect(page).not.toHaveURL(/view=deck/)
  await expect(page.getByRole('searchbox')).toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`deck view has no accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/?q=lava coil')
    await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
    await page.goto('/?view=deck')
    await expect(page.locator('.deck-view img')).toHaveCount(1)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}
