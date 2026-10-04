import { expect, test } from '@playwright/test'

test('opens card details with text, legality, and links', async ({ page }) => {
  await page.goto('/?q=trophy')
  await page.getByRole('button', { name: "Assassin's Trophy", exact: true }).click()

  const dialog = page.getByRole('dialog', { name: "Assassin's Trophy" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Destroy target permanent an opponent controls')
  await expect(dialog).toContainText('Instant')
  await expect(dialog.getByRole('img', { name: 'black, green' })).toBeVisible()
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

test('shows the set symbol next to the set name', async ({ page }) => {
  await page.goto('/?q=teferi, time raveler')
  await page.getByRole('button', { name: 'Teferi, Time Raveler', exact: true }).click()
  const icon = page.getByRole('dialog').getByRole('img', { name: 'War of the Spark set symbol' })
  await expect(icon).toBeVisible()
  const box = await icon.boundingBox()
  expect(box?.width).toBeGreaterThan(0)
  const svg = await page.request.get('/data/sets/war.svg')
  expect(svg.ok()).toBe(true)
})

test('close button closes the dialog', async ({ page }) => {
  await page.goto('/?q=doom whisperer')
  await page.getByRole('button', { name: 'Doom Whisperer', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Doom Whisperer' })
  await expect(dialog).toContainText('6/6')
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
})

test('rules text shows mana symbols with labels', async ({ page }) => {
  await page.goto("/?q=firemind's research")
  await page.getByRole('button', { name: "Firemind's Research", exact: true }).click()
  const oracle = page.getByRole('dialog').locator('.oracle')
  await expect(oracle.getByRole('img', { name: 'blue' })).toHaveCount(1)
  await expect(oracle.getByRole('img', { name: 'red' })).toHaveCount(1)
  await expect(oracle).not.toContainText('{')
})
