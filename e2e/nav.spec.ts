import { test, expect } from '@playwright/test'
import { center, dragTo } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

test('Back is disabled until an edit, then undoes it', async ({ page }) => {
  const back = page.getByRole('button', { name: 'Undo the last edit' })
  await expect(back).toBeDisabled()

  const a2 = page.locator('[data-square="a2"]')
  const a4 = page.locator('[data-square="a4"]')
  await dragTo(page, a2, await center(a4))
  await expect(page.locator('[data-square="a4"] img.piece')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Black to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(back).toBeEnabled()

  await back.click()
  await expect(page.locator('[data-square="a2"] img.piece')).toBeVisible()
  await expect(page.locator('[data-square="a4"] img.piece')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'White to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(back).toBeDisabled()
})

test('the Left arrow undoes the last move', async ({ page }) => {
  const a2 = page.locator('[data-square="a2"]')
  const a4 = page.locator('[data-square="a4"]')
  await dragTo(page, a2, await center(a4))
  await expect(page.locator('[data-square="a4"] img.piece')).toBeVisible()

  await page.locator('body').press('ArrowLeft')
  await expect(page.locator('[data-square="a2"] img.piece')).toBeVisible()
  await expect(page.locator('[data-square="a4"] img.piece')).toHaveCount(0)
})

test('Forward plays the suggested move and flips the turn', async ({ page }) => {
  test.setTimeout(30_000)
  const forward = page.getByRole('button', { name: 'Play the suggested move' })
  await expect(forward).toBeDisabled()

  await page.waitForSelector('.board .square.hl-to', { timeout: 25_000 })
  await expect(forward).toBeEnabled()

  const from = await page.locator('.board .square.hl-from').getAttribute('data-square')
  const to = await page.locator('.board .square.hl-to').getAttribute('data-square')
  await forward.click()

  await expect(page.locator(`[data-square="${from}"] img.piece`)).toHaveCount(0)
  await expect(page.locator(`[data-square="${to}"] img.piece`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Black to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
