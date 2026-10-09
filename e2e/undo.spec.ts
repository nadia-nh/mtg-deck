import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('adding a card shows a toast; Undo restores the count', async ({ page }) => {
  await page.goto('/?q=lava coil')
  const counts = page.getByTestId('deck-counts')
  const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
  await add.click()
  await add.click()
  await expect(counts).toHaveText('2 main · 0 side')

  // Announced through the status region, and shown in the toast.
  await expect(page.getByRole('status').filter({ hasText: 'Added Lava Coil' })).toBeAttached()
  await page.getByRole('button', { name: 'Undo: Added Lava Coil' }).click()
  await expect(counts).toHaveText('1 main · 0 side')
  await expect(page.locator('.toast')).toHaveCount(0)

  // Persisted: the undone copy stays gone after a reload.
  await page.reload()
  await expect(page.getByTestId('deck-counts')).toHaveText('1 main · 0 side')
})

test('deleting a deck can be undone from the toast', async ({ page }) => {
  await page.goto('/?q=lava coil')
  const panel = page.locator('.deck-panel')
  await panel.getByRole('textbox', { name: 'Name' }).fill('Burn')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()

  await panel.getByRole('button', { name: 'Delete…' }).click()
  await panel.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(panel.getByRole('textbox', { name: 'Name' })).toHaveValue('Untitled deck')

  await page.getByRole('button', { name: 'Undo: Deleted Burn' }).click()
  await expect(panel.getByRole('textbox', { name: 'Name' })).toHaveValue('Burn')
  await expect(page.getByTestId('deck-counts')).toHaveText('1 main · 0 side')
  await expect(panel.getByRole('combobox', { name: /^Deck/ }).locator('option')).toHaveCount(1)
})

test('Ctrl+Z undoes step by step, but not while typing in a field', async ({ page }) => {
  await page.goto('/?q=lava coil')
  const counts = page.getByTestId('deck-counts')
  const add = page.getByRole('button', { name: 'Add Lava Coil to deck' })
  await add.click()
  await add.click()
  await add.click()

  await page.locator('body').press('Control+z')
  await expect(counts).toHaveText('2 main · 0 side')
  await page.locator('body').press('Control+z')
  await expect(counts).toHaveText('1 main · 0 side')

  // In the search box, Ctrl+Z is the browser's own text undo.
  await page.getByRole('searchbox').press('Control+z')
  await expect(counts).toHaveText('1 main · 0 side')
})

test('the toast dismisses itself, but waits while hovered', async ({ page }) => {
  await page.clock.install()
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  const toast = page.locator('.toast')
  await expect(toast).toBeVisible()

  await toast.hover()
  await page.clock.runFor(10_000)
  await expect(toast).toBeVisible()

  await page.mouse.move(5, 5)
  await page.clock.runFor(7_000)
  await expect(toast).toHaveCount(0)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`toast has no accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/?q=lava coil')
    await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
    await expect(page.locator('.toast')).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.toast-region')
      .analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}
