import { describe, expect, it } from 'vitest'
import {
  formatScore,
  parseBestMove,
  parseInfo,
  whiteCentipawns,
  whiteMate,
  type Score,
} from './uci.ts'

const cp = (value: number): Score => ({ type: 'cp', value })
const mate = (value: number): Score => ({ type: 'mate', value })

describe('parseInfo', () => {
  it('parses a centipawn info line', () => {
    const line =
      'info depth 15 seldepth 20 multipv 1 score cp 34 nodes 12345 nps 100000 time 42 pv e2e4 e7e5 g1f3'
    expect(parseInfo(line)).toEqual({
      depth: 15,
      score: { type: 'cp', value: 34 },
      pv: ['e2e4', 'e7e5', 'g1f3'],
    })
  })

  it('parses a mate info line', () => {
    const line = 'info depth 6 score mate 3 pv d1h5 g8f6 h5f7'
    expect(parseInfo(line)).toEqual({
      depth: 6,
      score: { type: 'mate', value: 3 },
      pv: ['d1h5', 'g8f6', 'h5f7'],
    })
  })

  it('ignores lowerbound and upperbound scores', () => {
    expect(parseInfo('info depth 10 score cp 20 upperbound pv e2e4')).toBeNull()
    expect(parseInfo('info depth 10 score cp 20 lowerbound pv e2e4')).toBeNull()
  })

  it('ignores info lines without a principal variation', () => {
    expect(parseInfo('info depth 1 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfo('info string Some diagnostic text')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('parses a best move with a ponder move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({ move: 'e2e4', ponder: 'e7e5' })
  })

  it('parses a best move without a ponder move', () => {
    expect(parseBestMove('bestmove g1f3')).toEqual({ move: 'g1f3', ponder: null })
  })

  it('reports no move for bestmove (none)', () => {
    expect(parseBestMove('bestmove (none)')).toEqual({ move: null, ponder: null })
  })

  it('returns null for a non-bestmove line', () => {
    expect(parseBestMove('info depth 1 pv e2e4')).toBeNull()
  })
})

describe('score normalisation to White', () => {
  it('keeps the sign when White is to move', () => {
    expect(whiteCentipawns(cp(120), 'w')).toBe(120)
    expect(whiteMate(mate(3), 'w')).toBe(3)
  })

  it('flips the sign when Black is to move', () => {
    expect(whiteCentipawns(cp(120), 'b')).toBe(-120)
    expect(whiteMate(mate(3), 'b')).toBe(-3)
  })

  it('returns null for the wrong score kind', () => {
    expect(whiteCentipawns(mate(2), 'w')).toBeNull()
    expect(whiteMate(cp(50), 'w')).toBeNull()
  })
})

describe('formatScore', () => {
  it('formats centipawn scores from Whites point of view', () => {
    expect(formatScore(cp(124), 'w')).toBe('+1.24')
    expect(formatScore(cp(80), 'b')).toBe('-0.80')
    expect(formatScore(cp(0), 'w')).toBe('0.00')
  })

  it('formats mate scores from Whites point of view', () => {
    expect(formatScore(mate(3), 'w')).toBe('#3')
    expect(formatScore(mate(2), 'b')).toBe('#-2')
  })
})
