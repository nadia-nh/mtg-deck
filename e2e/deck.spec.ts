import { expect, test } from '@playwright/test'

test('add cards from the grid and the detail dialog, edit counts, persist', async ({ page }) => {
  await page.goto('/?q=lava coil')
  const counts = page.getByTestId('deck-counts')
  await expect(counts).toHaveText('0 main · 0 side')

  const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
  await add.click()
  await add.click()
  await expect(counts).toHaveText('2 main · 0 side')
  await expect(page.getByLabel('2 in deck')).toBeVisible()

  // Detail dialog adds to the sideboard.
  await page.getByRole('button', { name: 'Lava Coil', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Add to sideboard' }).click()
  await page.keyboard.press('Escape')
  await expect(counts).toHaveText('2 main · 1 side')

  // Deck list controls.
  const panel = page.locator('.deck-panel')
  await panel.getByRole('button', { name: 'Add one Lava Coil' }).first().click()
  await expect(counts).toHaveText('3 main · 1 side')
  await panel.getByRole('button', { name: 'Move one Lava Coil to sideboard' }).click()
  await expect(counts).toHaveText('2 main · 2 side')

  await page.reload()
  await expect(page.getByTestId('deck-counts')).toHaveText('2 main · 2 side')
})

test('basic land quick-add', async ({ page }) => {
  await page.goto('/')
  const basics = page.getByRole('group', { name: 'Add basic land' })
  for (let i = 0; i < 3; i++) await basics.getByRole('button', { name: 'Add Mountain' }).click()
  await basics.getByRole('button', { name: 'Add Plains' }).click()
  await expect(page.getByTestId('deck-counts')).toHaveText('4 main · 0 side')
  await expect(page.locator('.deck-panel').getByRole('region', { name: 'Lands (4)' })).toBeVisible()
})
