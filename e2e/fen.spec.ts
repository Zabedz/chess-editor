import { test, expect } from '@playwright/test'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

test('loads a FEN, setting the pieces and the side to move', async ({ page }) => {
  await page.locator('.loader-input').fill('4k3/8/8/8/8/8/8/4Q1K1 b - - 0 1')
  await page.getByRole('button', { name: 'Load' }).click()

  await expect(page.locator('.board img.piece')).toHaveCount(3)
  await expect(page.locator('[data-square="e8"] img.piece')).toHaveAttribute('alt', 'black king')
  await expect(page.getByRole('button', { name: 'Black to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.loader-input')).toHaveValue('')
})

test('plays a PGN to its final position', async ({ page }) => {
  await page.locator('.loader-input').fill('1. e4 e5 2. Nf3 Nc6 3. Bb5')
  await page.getByRole('button', { name: 'Load' }).click()

  await expect(page.locator('[data-square="f3"] img.piece')).toHaveAttribute('alt', 'white knight')
  await expect(page.locator('[data-square="b5"] img.piece')).toHaveAttribute('alt', 'white bishop')
})

test('shows an error for unreadable input and clears it on the next edit', async ({ page }) => {
  await page.locator('.loader-input').fill('not a position')
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(page.locator('.loader-error')).toContainText('FEN or PGN')

  await page.locator('.loader-input').fill('r')
  await expect(page.locator('.loader-error')).toHaveText('')
})

test('a loaded position can be undone with Back', async ({ page }) => {
  await page.locator('.loader-input').fill('8/8/8/4k3/4K3/8/8/8 w - - 0 1')
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(2)

  await page.getByRole('button', { name: 'Undo the last edit' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(32)
})

test('Copy puts the shown FEN on the clipboard', async ({ page }) => {
  test.setTimeout(30_000)
  await page.waitForSelector('.fen-text', { state: 'visible', timeout: 25_000 })
  const shown = await page.locator('.fen-text').textContent()

  const copy = page.locator('.fen-copy')
  await copy.click()
  await expect(copy).toHaveText('Copied')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(shown)
})
