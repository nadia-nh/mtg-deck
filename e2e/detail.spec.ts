import { expect, test } from '@playwright/test'

test('opens card details with text, legality, and links', async ({ page }) => {
  await page.goto('/?q=trophy')
  await page.getByRole('button', { name: "Assassin's Trophy" }).click()

  const dialog = page.getByRole('dialog', { name: "Assassin's Trophy" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Destroy target permanent an opponent controls')
  await expect(dialog).toContainText('Instant')
  await expect(dialog.getByRole('row', { name: /Modern/ })).toContainText('Legal')
  await expect(dialog.getByRole('link', { name: 'View on Scryfall' })).toHaveAttribute(
    'href',
    /scryfall\.com\/card\/grn\/152/,
  )
  await expect(dialog.getByRole('link', { name: 'Buy on TCGplayer' })).toHaveAttribute(
    'href',
    /^https:\/\/www\.tcgplayer\.com\/product\/\d+$/,
  )

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('close button closes the dialog', async ({ page }) => {
  await page.goto('/?q=doom whisperer')
  await page.getByRole('button', { name: 'Doom Whisperer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Doom Whisperer' })
  await expect(dialog).toContainText('6/6')
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
})
