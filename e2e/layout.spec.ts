import { test, expect } from '@playwright/test'

// DDR-01: the three-column view fits the viewport at 100% zoom with no vertical
// scroll. The board caps its own height so the column stays within the fold;
// these tests fail if a change pushes content below it.

const REFERENCE_VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
]

for (const viewport of REFERENCE_VIEWPORTS) {
  test(`fits ${viewport.width}x${viewport.height} with no vertical scroll`, async ({ page }) => {
    test.setTimeout(30_000)
    await page.setViewportSize(viewport)
    await page.goto('/')

    // Load a real position so the eval panel reaches its tallest state (score,
    // best move, legend, and FEN all shown), the worst case for the budget.
    await page.locator('.loader-input').fill('r3k2r/pp3ppp/2n5/8/4P3/5N2/PP3PPP/R3K2R b - - 0 1')
    await page.getByRole('button', { name: 'Load' }).click()
    await expect(page.locator('.eval-status')).toHaveAttribute('data-tone', 'ready', {
      timeout: 25_000,
    })

    const overflow = await page.evaluate(() => {
      const doc = document.scrollingElement
      if (!doc) throw new Error('no scrolling element')
      return doc.scrollHeight - doc.clientHeight
    })
    expect(overflow).toBeLessThanOrEqual(0)

    // The load box stays above the fold in the right rail.
    const loader = await page.locator('.position-loader').boundingBox()
    if (!loader) throw new Error('position loader has no bounding box')
    expect(loader.y + loader.height).toBeLessThanOrEqual(viewport.height)
  })
}

test('the toolbar spans the full board width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.locator('.board [data-square="e2"] img.piece').waitFor()

  const board = await page.locator('.board-wrap').boundingBox()
  const tools = await page.locator('.board-tools').boundingBox()
  if (!board || !tools) throw new Error('board or toolbar has no bounding box')
  expect(Math.abs(tools.x - board.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(tools.x + tools.width - (board.x + board.width))).toBeLessThanOrEqual(1)
})
