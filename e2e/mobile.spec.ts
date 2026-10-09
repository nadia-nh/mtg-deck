import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

const bar = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^Open deck:/ })

test('a bottom deck bar replaces the top panel and updates as cards are added', async ({
  page,
}) => {
  await page.goto('/?q=lava coil')
  await expect(bar(page)).toBeVisible()
  await expect(bar(page)).toHaveAccessibleName('Open deck: Untitled deck, 0 of 60 cards, 1 problem')
  await expect(page.locator('.workspace > .deck-panel')).toHaveCount(0)

  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  await expect(page.getByTestId('deck-bar-count')).toHaveText('1/60')

  // Pinned to the bottom of the screen.
  const box = (await bar(page).boundingBox())!
  expect(box.y + box.height).toBeCloseTo(844, 0)
})

test('the bar opens the deck as a sheet; Esc and the close button return focus', async ({
  page,
}) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()

  await bar(page).click()
  const sheet = page.getByRole('dialog', { name: /Untitled deck/ })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('tab', { name: 'Cards' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Add one Lava Coil' }).click()
  await expect(sheet.getByTestId('deck-counts')).toHaveText('2 main · 0 side')

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(bar(page)).toBeFocused()
  await expect(page.getByTestId('deck-bar-count')).toHaveText('2/60')

  await bar(page).click()
  await sheet.getByRole('button', { name: 'Close deck' }).click()
  await expect(sheet).toBeHidden()
  await expect(bar(page)).toBeFocused()
})

test('dragging the sheet header down closes it; a short drag springs back', async ({ page }) => {
  await page.goto('/')
  await bar(page).click()
  const sheet = page.getByRole('dialog', { name: /Untitled deck/ })
  await expect(sheet).toBeVisible()
  await expect(sheet).toHaveCSS('transform', 'none') // slide-up animation finished
  const title = (await sheet.getByRole('heading', { level: 2 }).boundingBox())!
  const x = title.x + 20
  const y = title.y + title.height / 2

  // Short, slow drag: stays open and returns to place.
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 40, { steps: 10 })
  await page.waitForTimeout(200)
  await page.mouse.up()
  await expect(sheet).toBeVisible()
  await expect(sheet).toHaveCSS('transform', 'none')

  // Long drag: closes, and focus goes back to the bar.
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 200, { steps: 10 })
  await page.mouse.up()
  await expect(sheet).toBeHidden()
  await expect(bar(page)).toBeFocused()
})

test('choosing a card in the sheet closes it and opens the card details', async ({ page }) => {
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  await bar(page).click()
  const sheet = page.getByRole('dialog', { name: /Untitled deck/ })
  await sheet.getByRole('button', { name: 'Lava Coil', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Lava Coil' })).toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`bar and open sheet have no accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/?q=lava coil')
    await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
    const scan = () =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    let { violations } = await scan()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])

    await bar(page).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    ;({ violations } = await scan())
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}
