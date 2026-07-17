import { describe, expect, it } from 'vitest'
import type { Piece, Square } from './types.ts'
import {
  boardFromPlacement,
  inferCastling,
  placementFromBoard,
  START_FEN,
  toFen,
} from './fen.ts'

const START_PLACEMENT = START_FEN.split(' ')[0]

function board(entries: Array<[Square, Piece]>): Map<Square, Piece> {
  return new Map(entries)
}

describe('boardFromPlacement', () => {
  it('parses the starting position into 32 pieces', () => {
    const pieces = boardFromPlacement(START_PLACEMENT)
    expect(pieces.size).toBe(32)
    expect(pieces.get('e1')).toEqual({ color: 'w', role: 'k' })
    expect(pieces.get('e8')).toEqual({ color: 'b', role: 'k' })
    expect(pieces.get('a2')).toEqual({ color: 'w', role: 'p' })
    expect(pieces.get('d8')).toEqual({ color: 'b', role: 'q' })
    expect(pieces.get('e4')).toBeUndefined()
  })

  it('rejects a placement without 8 ranks', () => {
    expect(() => boardFromPlacement('8/8/8')).toThrow(/8 ranks/)
  })

  it('rejects an invalid piece character', () => {
    expect(() => boardFromPlacement('8/8/8/8/8/8/8/7x')).toThrow(/piece character/)
  })

  it('rejects a rank that does not fill 8 files', () => {
    expect(() => boardFromPlacement('8/8/8/8/8/8/8/7')).toThrow(/8 files/)
  })

  it('rejects a rank that overflows past the h file', () => {
    expect(() => boardFromPlacement('8/8/8/8/8/8/8/ppppppppp')).toThrow(/past the h file/)
  })
})

describe('placementFromBoard', () => {
  it('round-trips the starting position', () => {
    const pieces = boardFromPlacement(START_PLACEMENT)
    expect(placementFromBoard(pieces)).toBe(START_PLACEMENT)
  })

  it('round-trips a sparse position', () => {
    const placement = '4k3/8/8/8/3P4/8/8/4K3'
    expect(placementFromBoard(boardFromPlacement(placement))).toBe(placement)
  })

  it('encodes an empty board as all eights', () => {
    expect(placementFromBoard(new Map())).toBe('8/8/8/8/8/8/8/8')
  })
})

describe('inferCastling', () => {
  it('gives full rights for the starting position', () => {
    expect(inferCastling(boardFromPlacement(START_PLACEMENT))).toBe('KQkq')
  })

  it('drops a side whose rook has moved', () => {
    const pieces = boardFromPlacement(START_PLACEMENT)
    pieces.delete('h1')
    expect(inferCastling(pieces)).toBe('Qkq')
  })

  it('drops both white rights when the king is off its home square', () => {
    const pieces = boardFromPlacement(START_PLACEMENT)
    pieces.delete('e1')
    pieces.set('e2', { color: 'w', role: 'k' })
    expect(inferCastling(pieces)).toBe('kq')
  })

  it('ignores a non-rook sitting on a corner square', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['a1', { color: 'w', role: 'q' }],
      ['h1', { color: 'w', role: 'r' }],
      ['e8', { color: 'b', role: 'k' }],
    ])
    expect(inferCastling(pieces)).toBe('K')
  })

  it('returns a dash when no rights exist', () => {
    const pieces = board([
      ['e4', { color: 'w', role: 'k' }],
      ['e5', { color: 'b', role: 'k' }],
    ])
    expect(inferCastling(pieces)).toBe('-')
  })
})

describe('toFen', () => {
  it('produces the standard starting FEN', () => {
    expect(toFen(boardFromPlacement(START_PLACEMENT), 'w')).toBe(START_FEN)
  })

  it('reflects the side to move and clears en passant and clocks', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['e8', { color: 'b', role: 'k' }],
    ])
    expect(toFen(pieces, 'b')).toBe('4k3/8/8/8/8/8/8/4K3 b - - 0 1')
  })

  it('writes the en passant square when one is given', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['e8', { color: 'b', role: 'k' }],
      ['d5', { color: 'b', role: 'p' }],
      ['e5', { color: 'w', role: 'p' }],
    ])
    expect(toFen(pieces, 'w', 'd6')).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1')
  })
})
