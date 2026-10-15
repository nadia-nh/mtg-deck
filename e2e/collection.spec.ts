import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const openDetails = async (page: Page, name: string) => {
  await page.goto(`/?q=${encodeURIComponent(name)}`)
  await page.getByRole('button', { name, exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name })
  await expect(dialog).toBeVisible()
  return dialog
}

test('mark copies as owned from the card details; it is remembered', async ({ page }) => {
  let dialog = await openDetails(page, 'Lava Coil')
  const owned = dialog.getByRole('group', { name: 'Copies you own' })
  await expect(owned.getByTestId('owned-count')).toHaveText('0')
  await expect(owned.getByRole('button', { name: 'One fewer owned' })).toBeDisabled()

  await owned.getByRole('button', { name: 'One more owned' }).click()
  await owned.getByRole('button', { name: 'One more owned' }).click()
  await owned.getByRole('button', { name: 'One more owned' }).click()
  await owned.getByRole('button', { name: 'One fewer owned' }).click()
  await expect(owned.getByTestId('owned-count')).toHaveText('2')

  await page.reload()
  dialog = await openDetails(page, 'Lava Coil')
  await expect(dialog.getByTestId('owned-count')).toHaveText('2')
})

test('"Owned only" shows just the cards you own, as a chip and in the URL', async ({ page }) => {
  const dialog = await openDetails(page, 'Lava Coil')
  await dialog.getByRole('button', { name: 'One more owned' }).click()
  await page.keyboard.press('Escape')

  await page.goto('/')
  await page.getByLabel('Owned only').check()
  await expect(page).toHaveURL(/o=1/)
  await expect(page.locator('#results-heading')).toHaveText('1 card')
  await expect(page.getByRole('img', { name: 'Lava Coil' })).toBeVisible()

  await page.getByRole('button', { name: 'Remove filter: Owned' }).click()
  await expect(page).not.toHaveURL(/o=1/)
  await expect(page.locator('#results-heading')).not.toHaveText('1 card')
})

test('the Stats tab lists what the deck still needs; basics never count', async ({ page }) => {
  await page.goto('/?q=lava coil')
  const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
  for (let i = 0; i < 3; i++) await add.click()
  await page.locator('.deck-panel').getByRole('button', { name: 'Add Mountain' }).click()

  const panel = page.locator('.deck-panel')
  await panel.getByRole('tab', { name: 'Stats' }).click()
  const missing = panel.getByRole('region', { name: 'Missing from your collection' })
  await expect(missing.getByTestId('missing-summary')).toHaveText(/^3 cards · about \$\d+\.\d{2}$/)
  await expect(missing.getByRole('listitem')).toHaveText([/^3 ×\s*Lava Coil/])

  // Own two: one left to get. Own the third: nothing missing.
  await page.getByRole('button', { name: 'Lava Coil', exact: true }).first().click()
  const owned = page.getByRole('dialog').getByRole('group', { name: 'Copies you own' })
  await owned.getByRole('button', { name: 'One more owned' }).click()
  await owned.getByRole('button', { name: 'One more owned' }).click()
  await page.keyboard.press('Escape')
  await expect(missing.getByTestId('missing-summary')).toHaveText(/^1 card · /)

  await page.getByRole('button', { name: 'Lava Coil', exact: true }).first().click()
  await owned.getByRole('button', { name: 'One more owned' }).click()
  await page.keyboard.press('Escape')
  await expect(missing).toContainText('You own every card in this deck.')
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`owned controls have no accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await openDetails(page, 'Lava Coil')
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('dialog')
      .analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}
