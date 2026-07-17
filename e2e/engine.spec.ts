import { test, expect } from '@playwright/test'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

test('loads Stockfish and evaluates the starting position', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/')

  const result = await page.evaluate(async (fen) => {
    const mod = await import('/src/engine/stockfish.ts')
    const engine = new mod.StockfishEngine()
    await engine.whenReady()
    const evaluation = await engine.evaluate(fen, { depth: 12 })
    engine.terminate()
    return evaluation
  }, START_FEN)

  expect(result.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/)
  expect(result.depth).toBeGreaterThanOrEqual(12)
  expect(result.score.type).toBe('cp')
  expect(result.text).toMatch(/^[+-]?\d/)
})

test('rejects a pending search when the engine is terminated', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/')

  const outcome = await page.evaluate(async (fen) => {
    const mod = await import('/src/engine/stockfish.ts')
    const engine = new mod.StockfishEngine()
    await engine.whenReady()
    const pending = engine.evaluate(fen, { depth: 40 }).then(
      () => 'resolved',
      () => 'rejected',
    )
    engine.terminate()
    return pending
  }, START_FEN)

  expect(outcome).toBe('rejected')
})
