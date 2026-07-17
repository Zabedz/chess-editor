import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()
})

async function squareOrder(page: import('@playwright/test').Page): Promise<string[]> {
  return page.locator('.board .square').evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).dataset.square ?? ''),
  )
}

async function paletteOrder(page: import('@playwright/test').Page): Promise<string[]> {
  return page.locator('.pgroup-label').allTextContents()
}

test('Flip reverses the board and swaps the palette side order', async ({ page }) => {
  const flip = page.getByRole('button', { name: 'Flip board' })

  let squares = await squareOrder(page)
  expect(squares[0]).toBe('a8')
  expect(squares[63]).toBe('h1')
  expect(await paletteOrder(page)).toEqual(['Black', 'White'])

  await flip.click()
  squares = await squareOrder(page)
  expect(squares[0]).toBe('h1')
  expect(squares[63]).toBe('a8')
  expect(await paletteOrder(page)).toEqual(['White', 'Black'])

  await flip.click()
  squares = await squareOrder(page)
  expect(squares[0]).toBe('a8')
  expect(squares[63]).toBe('h1')
  expect(await paletteOrder(page)).toEqual(['Black', 'White'])
})

test('the f key flips the board when focus is not in a text field', async ({ page }) => {
  await page.locator('body').press('f')
  const squares = await squareOrder(page)
  expect(squares[0]).toBe('h1')
  expect(await paletteOrder(page)).toEqual(['White', 'Black'])
})

test('a modified F (Ctrl/Meta+F) leaves the board alone', async ({ page }) => {
  await page.locator('body').press('Control+f')
  await page.locator('body').press('Meta+f')
  const squares = await squareOrder(page)
  expect(squares[0]).toBe('a8')
  expect(squares[63]).toBe('h1')
})

test('flipping keeps the pieces on their squares', async ({ page }) => {
  await page.getByRole('button', { name: 'Flip board' }).click()
  await expect(page.locator('.board img.piece')).toHaveCount(32)
  await expect(page.locator('.board [data-square="e1"] img.piece')).toHaveAttribute(
    'alt',
    'white king',
  )
})
