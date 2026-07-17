import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

test('Clear board empties every square', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear board' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(0)
})

test('Reset restores the starting position and White to move', async ({ page }) => {
  await page.getByRole('button', { name: 'Black to move' }).click()
  await page.getByRole('button', { name: 'Clear board' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(0)

  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(32)
  await expect(page.getByRole('button', { name: 'White to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('the turn toggle flips the side to move both ways', async ({ page }) => {
  const white = page.getByRole('button', { name: 'White to move' })
  const black = page.getByRole('button', { name: 'Black to move' })
  await expect(white).toHaveAttribute('aria-pressed', 'true')

  await black.click()
  await expect(black).toHaveAttribute('aria-pressed', 'true')
  await expect(white).toHaveAttribute('aria-pressed', 'false')

  await white.click()
  await expect(white).toHaveAttribute('aria-pressed', 'true')
  await expect(black).toHaveAttribute('aria-pressed', 'false')
})

test('Clear board keeps the side to move', async ({ page }) => {
  await page.getByRole('button', { name: 'Black to move' }).click()
  await page.getByRole('button', { name: 'Clear board' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Black to move' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
