import { describe, expect, it } from 'vitest'
import { pathBetween } from './geometry.ts'

describe('pathBetween', () => {
  it('lists the squares between a rook move along a file', () => {
    expect(pathBetween('e1', 'e8')).toEqual(['e2', 'e3', 'e4', 'e5', 'e6', 'e7'])
  })

  it('lists the squares between a move along a rank', () => {
    expect(pathBetween('a4', 'd4')).toEqual(['b4', 'c4'])
  })

  it('lists the squares along a diagonal', () => {
    expect(pathBetween('c1', 'f4')).toEqual(['d2', 'e3'])
  })

  it('handles a descending diagonal', () => {
    expect(pathBetween('f4', 'c1')).toEqual(['e3', 'd2'])
  })

  it('returns empty for a one-step move', () => {
    expect(pathBetween('e2', 'e3')).toEqual([])
  })

  it('keeps the passed square for a two-step pawn move', () => {
    expect(pathBetween('e2', 'e4')).toEqual(['e3'])
  })

  it('returns empty for a knight jump', () => {
    expect(pathBetween('g1', 'f3')).toEqual([])
  })

  it('returns the king path for kingside castling', () => {
    expect(pathBetween('e1', 'g1')).toEqual(['f1'])
  })
})
