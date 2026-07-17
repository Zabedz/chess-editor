import { test, expect } from '@playwright/test'

const TOGGLE = /Switch to (light|dark) theme/

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.locator('.board').waitFor()
})

test('the theme toggle flips the theme both ways', async ({ page }) => {
  const toggle = page.getByRole('button', { name: TOGGLE })
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))

  await toggle.click()
  const first = await theme()
  expect(first === 'light' || first === 'dark').toBe(true)

  await toggle.click()
  const second = await theme()
  expect(second === 'light' || second === 'dark').toBe(true)
  expect(second).not.toBe(first)
})

test('the theme choice persists across a reload', async ({ page }) => {
  const toggle = page.getByRole('button', { name: TOGGLE })
  await toggle.click()
  const chosen = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

  await page.reload()
  await page.locator('.board').waitFor()
  const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(afterReload).toBe(chosen)
})
