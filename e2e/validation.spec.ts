import { expect, test, type Page } from '@playwright/test'

async function addFromSearch(page: Page, name: string, n: number) {
  await page.getByRole('searchbox').fill(name)
  const add = page.getByRole('button', { name: `Add ${name} to deck`, exact: true }).first()
  for (let i = 0; i < n; i++) await add.click()
}

test('build a 60-card Boros deck, validate it, break it, persist it', async ({ page }) => {
  await page.goto('/')
  const validity = page.getByTestId('validity')
  await expect(validity).toHaveText('✗ 1 problem for Pioneer')

  await addFromSearch(page, 'Boros Challenger', 4)
  await addFromSearch(page, 'Legion Warboss', 4)
  await addFromSearch(page, 'Skyknight Legionnaire', 4)
  await addFromSearch(page, 'Light of the Legion', 2)
  await addFromSearch(page, 'Lava Coil', 4)
  await addFromSearch(page, 'Conclave Tribunal', 4)
  await addFromSearch(page, 'Sure Strike', 4)
  await addFromSearch(page, 'Sacred Foundry', 4)
  await addFromSearch(page, 'Boros Guildgate', 4)
  const basics = page.getByRole('group', { name: 'Add basic land' })
  for (let i = 0; i < 13; i++) {
    await basics.getByRole('button', { name: 'Add Mountain' }).click()
    await basics.getByRole('button', { name: 'Add Plains' }).click()
  }

  await expect(page.getByTestId('deck-counts')).toHaveText('60 main · 0 side')
  await expect(validity).toHaveText('✓ Valid for Pioneer')
  const stats = page.getByRole('region', { name: 'Deck statistics' })
  await expect(stats).toContainText('34lands')
  await expect(stats).toContainText('26spells')
  await expect(page.getByTestId('deck-price')).toHaveText(/^\$\d+\.\d{2}$/)

  // Dropping below 60 is an error. (A 5th copy can't be added at all; see deck.spec.)
  await page.locator('.deck-panel').getByRole('button', { name: 'Remove one Mountain' }).click()
  await expect(validity).toHaveText('✗ 1 problem for Pioneer')
  await expect(page.locator('.issues')).toContainText('Main deck has 59 cards; needs at least 60.')

  // Switching format re-validates: most GRN cards aren't Standard-legal.
  await page.getByRole('combobox', { name: /^Format/ }).selectOption('standard')
  await expect(page.locator('.issues')).toContainText('Boros Challenger is not legal in Standard.')

  await page.reload()
  await expect(page.getByRole('combobox', { name: /^Format/ })).toHaveValue('standard')
  await expect(page.getByTestId('deck-counts')).toHaveText('59 main · 0 side')
})
