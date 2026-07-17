import type { Locator, Page } from '@playwright/test'

export async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export async function dragTo(page: Page, from: Locator, to: { x: number; y: number }): Promise<void> {
  const start = await center(from)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move((start.x + to.x) / 2, (start.y + to.y) / 2, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 4 })
  await page.mouse.up()
}

/** A point just below the board, in a non-playing area, for drag-off-to-delete. */
export async function belowBoard(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator('.board').boundingBox()
  if (!box) throw new Error('board has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height + 40 }
}
