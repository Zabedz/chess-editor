import { test, expect } from '@playwright/test'
import { belowBoard, center, dragTo } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

test('places a palette piece on an empty square', async ({ page }) => {
  const swatch = page.getByRole('button', { name: 'white queen' })
  const e4 = page.locator('[data-square="e4"]')
  await dragTo(page, swatch, await center(e4))
  await expect(e4).toHaveAttribute('data-piece', 'wq')
  await expect(e4.locator('img.piece')).toHaveAttribute('alt', 'white queen')
})

test('moves a piece between squares', async ({ page }) => {
  const a2 = page.locator('[data-square="a2"]')
  const a4 = page.locator('[data-square="a4"]')
  await dragTo(page, a2, await center(a4))
  await expect(a2).toHaveAttribute('data-piece', '')
  await expect(a4).toHaveAttribute('data-piece', 'wp')
})

test('removes a piece dragged off the board', async ({ page }) => {
  const a2 = page.locator('[data-square="a2"]')
  await dragTo(page, a2, await belowBoard(page))
  await expect(a2).toHaveAttribute('data-piece', '')
})

test('captures by moving onto an occupied square', async ({ page }) => {
  const a2 = page.locator('[data-square="a2"]')
  const b7 = page.locator('[data-square="b7"]')
  await dragTo(page, a2, await center(b7))
  await expect(b7).toHaveAttribute('data-piece', 'wp')
  await expect(a2).toHaveAttribute('data-piece', '')
})

test('does not change the model until the pointer is released', async ({ page }) => {
  const a2 = page.locator('[data-square="a2"]')
  const a4 = page.locator('[data-square="a4"]')
  const start = await center(a2)
  const end = await center(a4)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 4 })
  // Mid-drag: the ghost follows the pointer but the model is untouched.
  await expect(page.locator('.drag-ghost')).toHaveCount(1)
  await expect(a2).toHaveAttribute('data-piece', 'wp')
  await expect(a4).toHaveAttribute('data-piece', '')
  await page.mouse.up()
  await expect(page.locator('.drag-ghost')).toHaveCount(0)
  await expect(a2).toHaveAttribute('data-piece', '')
  await expect(a4).toHaveAttribute('data-piece', 'wp')
})

test('dropping a palette piece off the board changes nothing', async ({ page }) => {
  const occupied = '.board [data-piece]:not([data-piece=""])'
  const before = await page.locator(occupied).count()
  const swatch = page.getByRole('button', { name: 'white queen' })
  await dragTo(page, swatch, await belowBoard(page))
  await expect(page.locator('.drag-ghost')).toHaveCount(0)
  expect(await page.locator(occupied).count()).toBe(before)
})

test('right-clicking a piece does not start a drag', async ({ page }) => {
  const a2 = page.locator('[data-square="a2"]')
  const spot = await center(a2)
  await page.mouse.move(spot.x, spot.y)
  await page.mouse.down({ button: 'right' })
  await page.mouse.up({ button: 'right' })
  await expect(page.locator('.drag-ghost')).toHaveCount(0)
  await expect(a2).toHaveAttribute('data-piece', 'wp')
})

test('a board move flips the turn to the other side', async ({ page }) => {
  const white = page.getByRole('button', { name: 'White to move' })
  const black = page.getByRole('button', { name: 'Black to move' })
  await expect(white).toHaveAttribute('aria-pressed', 'true')

  const a2 = page.locator('[data-square="a2"]')
  const a4 = page.locator('[data-square="a4"]')
  await dragTo(page, a2, await center(a4))
  await expect(black).toHaveAttribute('aria-pressed', 'true')

  // A second move alternates the turn back to White.
  const b7 = page.locator('[data-square="b7"]')
  const b5 = page.locator('[data-square="b5"]')
  await dragTo(page, b7, await center(b5))
  await expect(white).toHaveAttribute('aria-pressed', 'true')
})

test('placing and removing pieces does not flip the turn', async ({ page }) => {
  const white = page.getByRole('button', { name: 'White to move' })
  await expect(white).toHaveAttribute('aria-pressed', 'true')

  // Spawn a piece from the palette.
  const swatch = page.getByRole('button', { name: 'white queen' })
  const e4 = page.locator('[data-square="e4"]')
  await dragTo(page, swatch, await center(e4))
  await expect(white).toHaveAttribute('aria-pressed', 'true')

  // Delete a piece by dragging it off the board.
  await dragTo(page, e4, await belowBoard(page))
  await expect(white).toHaveAttribute('aria-pressed', 'true')
})
