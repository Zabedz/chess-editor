import { test, expect } from '@playwright/test'
import { center, dragTo } from './helpers.ts'

async function load(page: import('@playwright/test').Page, fen: string): Promise<void> {
  await page.locator('.loader-input').fill(fen)
  await page.getByRole('button', { name: 'Load' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

test('a pawn dragged onto the en passant square captures the passed pawn', async ({ page }) => {
  // White e5 pawn, Black pawn just moved d7-d5, so d6 is the en passant square.
  await load(page, '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1')
  await page.locator('[data-square="e5"] img.piece').waitFor()

  await dragTo(page, page.locator('[data-square="e5"]'), await center(page.locator('[data-square="d6"]')))

  await expect(page.locator('[data-square="d6"] img.piece')).toHaveAttribute('alt', 'white pawn')
  await expect(page.locator('[data-square="d5"] img.piece')).toHaveCount(0)
  await expect(page.locator('[data-square="e5"] img.piece')).toHaveCount(0)
})

test('the engine suggests en passant and Forward plays it', async ({ page }) => {
  test.setTimeout(45_000)
  // White is boxed in so its only legal move is the en passant capture b5xa6,
  // which makes the engine's best move deterministic regardless of depth.
  await load(page, 'k7/8/1p6/pP6/8/b1n5/8/K7 w - a6 0 1')

  await expect(page.locator('.eval-status')).toHaveAttribute('data-tone', 'ready', {
    timeout: 30_000,
  })
  await expect(page.locator('[data-el="moveUci"]')).toHaveText('b5a6')

  await page.getByRole('button', { name: 'Play the suggested move' }).click()

  await expect(page.locator('[data-square="a6"] img.piece')).toHaveAttribute('alt', 'white pawn')
  await expect(page.locator('[data-square="a5"] img.piece')).toHaveCount(0)
  await expect(page.locator('[data-square="b5"] img.piece')).toHaveCount(0)
})
