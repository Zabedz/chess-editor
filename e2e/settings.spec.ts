import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

function field(page: import('@playwright/test').Page, label: string) {
  return page.locator('.settings-field', { hasText: label })
}

test('the cogwheel opens the settings dialog and Done closes it', async ({ page }) => {
  const dialog = page.locator('.settings-dialog')
  await expect(dialog).not.toHaveAttribute('open', /.*/)
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(dialog).toHaveAttribute('open', /.*/)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).not.toHaveAttribute('open', /.*/)
})

test('a board theme swap recolours the dark squares and persists', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  await page.getByRole('button', { name: 'Blue' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-board', 'blue')
  const dark = page.locator('.square.dark').first()
  await expect(dark).toHaveCSS('background-color', 'rgb(75, 115, 153)')

  await page.reload()
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
  await expect(page.locator('html')).toHaveAttribute('data-board', 'blue')
})

test('the coordinate and highlight toggles hide their elements', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()

  await field(page, 'Show coordinates').locator('.toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-coords', 'off')
  await expect(page.locator('.square .coord').first()).toBeHidden()

  await field(page, 'Show move highlight').locator('.toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-highlight', 'off')
})

test('the depth slider updates its readout', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  const depth = page.locator('input[data-el="depth"]')
  await depth.focus()
  await depth.press('ArrowRight')
  await expect(page.locator('[data-el="depthVal"]')).toHaveText('16')
})

test('rebinding Flip to G makes G flip the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  await page
    .locator('.keyrow', { hasText: 'Flip board' })
    .getByRole('button', { name: 'Change' })
    .click()
  await page.keyboard.press('g')
  await expect(page.locator('.keyrow', { hasText: 'Flip board' }).locator('.keycap')).toHaveText('G')

  await page.getByRole('button', { name: 'Done' }).click()
  await page.locator('body').press('g')
  const order = await page.locator('.board .square').evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.square),
  )
  expect(order[0]).toBe('h1')
})

test('a rebind is refused when the key already runs another action', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  await page
    .locator('.keyrow', { hasText: 'Reset board' })
    .getByRole('button', { name: 'Change' })
    .click()
  await page.keyboard.press('ArrowLeft')

  await expect(page.locator('.shortcuts-note')).toContainText('Undo (Back)')
  await page.keyboard.press('Escape')
  await expect(page.locator('.keyrow', { hasText: 'Reset board' }).locator('.keycap')).toHaveText(
    'R',
  )
})

test('board shortcuts stay inert while the settings dialog is open', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click()
  await page.locator('.settings-title').click()
  await page.keyboard.press('f')
  const order = await page.locator('.board .square').evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.square),
  )
  expect(order[0]).toBe('a8')
})
