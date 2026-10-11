import { expect, test, type Page } from '@playwright/test'

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

test('deck panel tabs switch with the keyboard and keep validity pinned', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('.deck-panel')
  const tabs = panel.getByRole('tablist', { name: 'Deck sections' })
  const cards = tabs.getByRole('tab', { name: 'Cards' })
  await expect(cards).toHaveAttribute('aria-selected', 'true')
  await expect(panel.getByRole('tabpanel', { name: 'Cards' })).toContainText('Main deck (0)')

  await cards.focus()
  await page.keyboard.press('ArrowRight')
  const stats = tabs.getByRole('tab', { name: 'Stats' })
  await expect(stats).toBeFocused()
  await expect(stats).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('region', { name: 'Deck statistics' })).toBeVisible()
  await expect(panel.getByRole('tabpanel', { name: 'Cards' })).toBeHidden()

  await page.keyboard.press('End')
  await expect(tabs.getByRole('tab', { name: 'Import / export' })).toBeFocused()
  await expect(panel.getByRole('region', { name: 'Import decklist' })).toBeVisible()

  // The format and validity line stay outside the tabs, visible on every tab.
  await expect(page.getByTestId('validity')).toBeVisible()
  await expect(panel.getByRole('combobox', { name: /^Format/ })).toBeVisible()
})

test('on desktop the deck header and tabs stay pinned while the list scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.addInitScript(() => {
    const deck = {
      id: 'big',
      name: 'Big deck',
      formatId: 'casual',
      createdAt: '2026-10-04T00:00:00Z',
      updatedAt: '2026-10-04T00:00:00Z',
      main: {
        'Boros Challenger': 4,
        'Legion Warboss': 4,
        'Skyknight Legionnaire': 4,
        'Lava Coil': 4,
        'Conclave Tribunal': 4,
        'Sure Strike': 4,
        'Sacred Foundry': 4,
        'Boros Guildgate': 4,
        Mountain: 14,
        Plains: 14,
      },
      side: { 'Justice Strike': 2 },
    }
    localStorage.setItem('mtg-deck-builder:decks', JSON.stringify({ version: 1, decks: [deck] }))
    localStorage.setItem('mtg-deck-builder:active-deck', deck.id)
  })
  await page.goto('/')
  const panel = page.locator('.deck-panel')
  await expect(panel.getByRole('button', { name: 'Justice Strike', exact: true })).toBeAttached()
  await panel.evaluate((el) => (el.scrollTop = el.scrollHeight))

  const panelTop = (await panel.boundingBox())!.y
  for (const pinned of [page.getByTestId('validity'), panel.getByRole('tablist')]) {
    const box = (await pinned.boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(panelTop)
    expect(box.y).toBeLessThan(panelTop + 400)
  }
  await expect(panel.getByRole('button', { name: 'Justice Strike', exact: true })).toBeInViewport()
})

test.describe('deck list hover preview', () => {
  const addTwo = async (page: Page) => {
    for (const name of ['Lava Coil', 'Legion Warboss']) {
      await page.goto(`/?q=${encodeURIComponent(name)}`)
      await page.getByRole('button', { name: `Add ${name} to deck` }).click()
    }
  }

  test('hover and keyboard focus show the card image; leaving or Escape hides it', async ({
    page,
  }) => {
    await addTwo(page)
    const panel = page.locator('.deck-panel')
    const preview = page.locator('.card-preview')

    await panel.getByRole('button', { name: 'Lava Coil', exact: true }).hover()
    await expect(preview.getByRole('img', { name: 'Lava Coil' })).toBeVisible()
    // Beside the panel, not over the name it describes.
    const previewBox = (await preview.boundingBox())!
    const panelBox = (await panel.boundingBox())!
    expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(panelBox.x)

    await page.mouse.move(5, 5)
    await expect(preview).toHaveCount(0)

    // Keyboard: Tab from the Lava Coil row's "+" lands on its name.
    await panel.getByRole('button', { name: 'Add one Lava Coil' }).focus()
    await page.keyboard.press('Tab')
    await expect(preview.getByRole('img', { name: 'Lava Coil' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(preview).toHaveCount(0)
  })

  test('a keyboard-focused preview follows its name when the list scrolls, then hides out of view', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 700 })
    await page.addInitScript(() => {
      const deck = {
        id: 'long',
        name: 'Long deck',
        formatId: 'casual',
        createdAt: '2026-10-04T00:00:00Z',
        updatedAt: '2026-10-04T00:00:00Z',
        main: {
          'Boros Challenger': 4,
          'Legion Warboss': 4,
          'Skyknight Legionnaire': 4,
          'Lava Coil': 4,
          'Conclave Tribunal': 4,
          'Sure Strike': 4,
          'Sacred Foundry': 4,
          'Boros Guildgate': 4,
          Mountain: 14,
          Plains: 14,
        },
        side: { 'Justice Strike': 2 },
      }
      localStorage.setItem('mtg-deck-builder:decks', JSON.stringify({ version: 1, decks: [deck] }))
      localStorage.setItem('mtg-deck-builder:active-deck', deck.id)
    })
    await page.goto('/')
    const panel = page.locator('.deck-panel')
    const name = panel.getByRole('button', { name: 'Sure Strike', exact: true })
    await name.scrollIntoViewIfNeeded()
    // Keyboard focus (a hovered name would rightly hide once scrolling moves it from the pointer).
    await panel.getByRole('button', { name: 'Remove one Sure Strike' }).focus() // its + is disabled (4 copies)
    await page.keyboard.press('Tab')
    await expect(name).toBeFocused()
    // Focus not obscured (WCAG 2.4.11): the focused row is below the pinned header.
    const tabsBottom = await panel
      .getByRole('tablist')
      .evaluate((el) => el.getBoundingClientRect().bottom)
    expect((await name.boundingBox())!.y).toBeGreaterThanOrEqual(tabsBottom)
    const preview = page.locator('.card-preview')
    await expect(preview.getByRole('img', { name: 'Sure Strike' })).toBeVisible()

    // A small scroll (e.g. keyboard focus scrolling a row into view) keeps it, re-anchored.
    await panel.evaluate((el) => el.scrollBy(0, 60))
    await page.waitForTimeout(100) // let the scroll event fire
    await expect(preview.getByRole('img', { name: 'Sure Strike' })).toBeVisible()

    // Once the name is scrolled out of the panel, the preview goes away.
    // Scrolling to the bottom moves the name up under the pinned header: the preview goes.
    await panel.evaluate((el) => (el.scrollTop = el.scrollHeight))
    await expect(preview).toHaveCount(0)
  })

  test.describe('on a touch device', () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

    test('no preview; tapping the name opens the details', async ({ page }) => {
      await addTwo(page)
      // On phones the deck panel is in the bottom sheet.
      await page.getByRole('button', { name: /^Open deck:/ }).tap()
      const panel = page.getByRole('dialog').locator('.deck-panel')
      await panel.getByRole('button', { name: 'Lava Coil', exact: true }).tap()
      await expect(page.getByRole('dialog', { name: 'Lava Coil' })).toBeVisible()
      await expect(page.locator('.card-preview')).toHaveCount(0)
    })
  })
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
  await expect(name).toHaveValue(/^[A-Z][a-z]+ [A-Z][a-z]+$/) // a random name, e.g. "Brazen Gambit"
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

test('a new deck gets a random name, then a descriptive one; a typed name is kept', async ({
  page,
}) => {
  await page.goto('/')
  const name = page.locator('.deck-panel').getByRole('textbox', { name: 'Name' })
  await expect(name).toHaveValue(/^[A-Z][a-z]+ [A-Z][a-z]+$/)

  for (const card of ['Legion Warboss', 'Boros Challenger']) {
    await page.goto(`/?q=${encodeURIComponent(card)}`)
    const add = page.getByRole('button', { name: `Add ${card} to deck`, exact: true })
    for (let i = 0; i < 4; i++) await add.click()
  }
  await expect(name).toHaveValue('Boros Aggro')

  await name.fill('Friday Night')
  await name.press('Enter')
  await page.goto('/?q=lava coil')
  await page.getByRole('button', { name: 'Add Lava Coil to deck' }).click()
  await expect(name).toHaveValue('Friday Night')
  await page.reload()
  await expect(page.locator('.deck-panel').getByRole('textbox', { name: 'Name' })).toHaveValue(
    'Friday Night',
  )
})
