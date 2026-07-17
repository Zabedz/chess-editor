import { test, expect } from '@playwright/test'
import { center, dragTo } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

async function place(page: import('@playwright/test').Page, piece: string, square: string): Promise<void> {
  await dragTo(
    page,
    page.getByRole('button', { name: piece }),
    await center(page.locator(`[data-square="${square}"]`)),
  )
}

test('dragging the king two squares kingside castles, moving the rook to f1', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click()
  await place(page, 'white king', 'e1')
  await place(page, 'white rook', 'h1')

  await dragTo(page, page.locator('[data-square="e1"]'), await center(page.locator('[data-square="g1"]')))

  await expect(page.locator('[data-square="g1"] img.piece')).toHaveAttribute('alt', 'white king')
  await expect(page.locator('[data-square="f1"] img.piece')).toHaveAttribute('alt', 'white rook')
  await expect(page.locator('[data-square="e1"] img.piece')).toHaveCount(0)
  await expect(page.locator('[data-square="h1"] img.piece')).toHaveCount(0)
})

test('dragging the king two squares queenside hops the a-rook to d1', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click()
  await place(page, 'white king', 'e1')
  await place(page, 'white rook', 'a1')

  await dragTo(page, page.locator('[data-square="e1"]'), await center(page.locator('[data-square="c1"]')))

  await expect(page.locator('[data-square="c1"] img.piece')).toHaveAttribute('alt', 'white king')
  await expect(page.locator('[data-square="d1"] img.piece')).toHaveAttribute('alt', 'white rook')
  await expect(page.locator('[data-square="a1"] img.piece')).toHaveCount(0)
})

test('a two-square king move without a corner rook stays a plain king move', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click()
  await place(page, 'white king', 'e1')

  await dragTo(page, page.locator('[data-square="e1"]'), await center(page.locator('[data-square="g1"]')))

  await expect(page.locator('[data-square="g1"] img.piece')).toHaveAttribute('alt', 'white king')
  await expect(page.locator('[data-square="f1"] img.piece')).toHaveCount(0)
})
