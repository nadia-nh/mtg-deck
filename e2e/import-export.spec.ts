import { expect, test } from '@playwright/test'

const LIST = `About
Name Pasted Boros

Deck
4 Boros Challenger (GRN) 156
4 lava coil
3 Lava Coyl
20 Mountain
banana

Sideboard
2 Divine Visitation (GRN) 10
`

test('import replaces the deck and reports problems; export copies and downloads', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const panel = page.locator('.deck-panel')
  await panel.getByText('Import / export').click()

  await panel.getByRole('textbox', { name: /Paste a decklist/ }).fill(LIST)
  await panel.getByRole('button', { name: 'Replace this deck' }).click()

  const status = panel.locator('.import-result')
  await expect(status).toContainText('Imported 28 main and 2 sideboard cards.')
  await expect(status).toContainText('Not found (skipped): 3 Lava Coyl')
  await expect(status).toContainText('line 9 (“banana”)')
  await expect(page.getByTestId('deck-counts')).toHaveText('28 main · 2 side')

  const exported = panel.getByRole('textbox', { name: 'Exported decklist' })
  await expect(exported).toHaveValue(/^Deck\n4 Boros Challenger \(GRN\) 156\n/)
  await expect(exported).toHaveValue(/\nSideboard\n2 Divine Visitation \(GRN\) 10\n$/)

  await panel.getByRole('combobox', { name: /^Export format/ }).selectOption('text')
  await expect(exported).toHaveValue(/^4 Boros Challenger\n/)

  await panel.getByRole('button', { name: 'Copy' }).click()
  await expect(panel.getByRole('button', { name: 'Copied!' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^4 Boros Challenger/)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    panel.getByRole('button', { name: 'Download .txt' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('Untitled-deck.txt')
})

test('import as new deck uses the list name', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.deck-panel')
  await panel.getByText('Import / export').click()
  await panel.getByRole('textbox', { name: /Paste a decklist/ }).fill(LIST)
  await panel.getByRole('button', { name: 'Import as new deck' }).click()
  await expect(panel.getByRole('textbox', { name: 'Name' })).toHaveValue('Pasted Boros')
  await expect(panel.getByRole('combobox', { name: /^Deck/ }).locator('option')).toHaveCount(2)
})
