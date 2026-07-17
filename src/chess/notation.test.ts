import { describe, expect, it } from 'vitest'
import { START_FEN } from './fen.ts'
import { sanForMove } from './notation.ts'

describe('sanForMove', () => {
  it('names a pawn move', () => {
    expect(sanForMove(START_FEN, 'e2e4')).toBe('e4')
  })

  it('names a knight move', () => {
    expect(sanForMove(START_FEN, 'g1f3')).toBe('Nf3')
  })

  it('names kingside castling', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
    expect(sanForMove(fen, 'e1g1')).toBe('O-O')
  })

  it('names a promotion', () => {
    const fen = '8/4P3/8/8/8/8/8/k6K w - - 0 1'
    expect(sanForMove(fen, 'e7e8q')).toBe('e8=Q')
  })

  it('defaults a suffix-less promotion to a queen', () => {
    const fen = '8/4P3/8/8/8/8/8/k6K w - - 0 1'
    expect(sanForMove(fen, 'e7e8')).toBe('e8=Q')
  })

  it('marks a capture with check', () => {
    // White queen on h5 takes f7 with check.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1'
    expect(sanForMove(fen, 'h5f7')).toBe('Qxf7+')
  })

  it('returns null for a move that is not legal', () => {
    expect(sanForMove(START_FEN, 'e2e5')).toBeNull()
  })
})
