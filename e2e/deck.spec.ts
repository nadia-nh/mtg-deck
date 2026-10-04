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

test('a fifth copy cannot be added; removing one re-enables adding', async ({ page }) => {
  await page.goto('/?q=lava coil')
  const counts = page.getByTestId('deck-counts')
  const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
  for (let i = 0; i < 4; i++) await add.click()
  await expect(counts).toHaveText('4 main · 0 side')
  await expect(add).toBeDisabled()
  await expect(add).toHaveAttribute('title', 'Pioneer allows 4 copies; the deck has them all.')

  const panel = page.locator('.deck-panel')
  await expect(panel.getByRole('button', { name: 'Add one Lava Coil' })).toBeDisabled()

  await page.getByRole('button', { name: 'Lava Coil', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  const toSide = dialog.getByRole('button', { name: 'Add to sideboard' })
  await expect(toSide).toBeDisabled()
  await expect(toSide).toHaveAccessibleDescription(/Pioneer allows 4 copies/)
  await page.keyboard.press('Escape')

  await panel.getByRole('button', { name: 'Remove one Lava Coil' }).click()
  await expect(add).toBeEnabled()
  await expect(counts).toHaveText('3 main · 0 side')
})

test('basic land quick-add', async ({ page }) => {
  await page.goto('/')
  const basics = page.getByRole('group', { name: 'Add basic land' })
  for (let i = 0; i < 3; i++) await basics.getByRole('button', { name: 'Add Mountain' }).click()
  await basics.getByRole('button', { name: 'Add Plains' }).click()
  await expect(page.getByTestId('deck-counts')).toHaveText('4 main · 0 side')
  await expect(page.locator('.deck-panel').getByRole('region', { name: 'Lands (4)' })).toBeVisible()
})

test('create, rename, duplicate, switch, and delete decks', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.deck-panel')
  const picker = panel.getByRole('combobox', { name: /^Deck/ })
  const name = panel.getByRole('textbox', { name: 'Name' })

  await name.fill('Izzet Spells')
  await name.press('Enter')
  await expect(picker.locator('option:checked')).toHaveText('Izzet Spells')
  await panel.getByRole('button', { name: 'Add Island' }).click()

  await panel.getByRole('button', { name: 'Duplicate' }).click()
  await expect(name).toHaveValue('Izzet Spells (copy)')
  await expect(page.getByTestId('deck-counts')).toHaveText('1 main · 0 side')

  await panel.getByRole('button', { name: 'New deck' }).click()
  await expect(name).toHaveValue('Untitled deck')
  await expect(page.getByTestId('deck-counts')).toHaveText('0 main · 0 side')
  await expect(picker.locator('option')).toHaveCount(3)

  await panel.getByRole('button', { name: 'Delete…' }).click()
  await panel.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(picker.locator('option')).toHaveCount(2)

  await picker.selectOption({ label: 'Izzet Spells' })
  await expect(name).toHaveValue('Izzet Spells')

  await page.reload()
  await expect(panel.getByRole('textbox', { name: 'Name' })).toHaveValue('Izzet Spells')
  await expect(panel.getByRole('combobox', { name: /^Deck/ }).locator('option')).toHaveCount(2)
})
