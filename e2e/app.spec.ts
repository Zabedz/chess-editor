import { test, expect } from '@playwright/test'
import { center, dragTo } from './helpers.ts'

const HIGHLIGHT = '.board .square.hl-to'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

test('evaluates the start position and highlights the best-move tiles', async ({ page }) => {
  test.setTimeout(30_000)
  await page.waitForSelector(HIGHLIGHT, { timeout: 25_000 })
  await expect(page.locator('.board .square.hl-from')).toHaveCount(1)
  await expect(page.locator('.board .square.hl-to')).toHaveCount(1)
  await expect(page.locator('.eval-status')).toHaveAttribute('data-tone', 'ready')
  await expect(page.locator('.eval-panel .move-san')).not.toHaveText('')
})

test('re-evaluates after a move, flipping the turn and refreshing the highlight', async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.waitForSelector(HIGHLIGHT, { timeout: 25_000 })

  const a2 = page.locator('[data-square="a2"]')
  const a4 = page.locator('[data-square="a4"]')
  await dragTo(page, a2, await center(a4))

  await expect(page.getByRole('button', { name: 'Black to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.waitForSelector(HIGHLIGHT, { timeout: 25_000 })
  await expect(page.locator('.board .square.hl-to')).toHaveCount(1)
  await expect(page.locator('.eval-panel .stm')).toHaveText('Black to move')
})

test('clears the highlight and shows the empty state on Clear', async ({ page }) => {
  test.setTimeout(30_000)
  await page.waitForSelector(HIGHLIGHT, { timeout: 25_000 })

  await page.getByRole('button', { name: 'Clear board' }).click()
  await expect(page.locator('.board .square.hl-to')).toHaveCount(0)
  await expect(page.locator('.board .square.hl-from')).toHaveCount(0)
  await expect(page.locator('.eval-message')).toContainText('Place pieces')
})

test('reports an illegal position and does not highlight', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click()

  const king = page.getByRole('button', { name: 'white king' })
  const e1 = page.locator('[data-square="e1"]')
  await dragTo(page, king, await center(e1))

  await expect(page.locator('.eval-status')).toHaveAttribute('data-tone', 'illegal')
  await expect(page.locator('.eval-message')).toContainText('Black has no king')
  await expect(page.locator('.board .square.hl-to')).toHaveCount(0)
})

test('reports checkmate as a terminal state with no best move', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click()

  // Build a minimal mate: black king a8, white queen a7, white king b6, Black to move.
  const place = async (piece: string, square: string) => {
    await dragTo(page, page.getByRole('button', { name: piece }), await center(page.locator(`[data-square="${square}"]`)))
  }
  await place('black king', 'a8')
  await place('white queen', 'a7')
  await place('white king', 'b6')
  await page.getByRole('button', { name: 'Black to move' }).click()

  await expect(page.locator('.eval-status')).toHaveAttribute('data-tone', 'terminal')
  await expect(page.locator('.eval-message')).toContainText('Checkmate')
  await expect(page.locator('.eval-message')).toContainText('White wins')
  await expect(page.locator('.board .square.hl-to')).toHaveCount(0)
})
