import { describe, expect, it } from 'vitest'
import type { Piece, Square } from './types.ts'
import { boardFromPlacement, START_FEN } from './fen.ts'
import { classifyPosition } from './status.ts'

const START_PLACEMENT = START_FEN.split(' ')[0]

function board(entries: Array<[Square, Piece]>): Map<Square, Piece> {
  return new Map(entries)
}

describe('classifyPosition', () => {
  it('reports an empty board', () => {
    expect(classifyPosition(new Map(), 'w')).toEqual({ kind: 'empty' })
  })

  it('accepts the starting position', () => {
    const status = classifyPosition(boardFromPlacement(START_PLACEMENT), 'w')
    expect(status.kind).toBe('legal')
    if (status.kind === 'legal') expect(status.fen).toBe(START_FEN)
  })

  it('rejects a side with no king', () => {
    const pieces = board([['e1', { color: 'w', role: 'k' }]])
    const status = classifyPosition(pieces, 'w')
    expect(status).toEqual({ kind: 'illegal', reason: 'Black has no king.' })
  })

  it('rejects more than one king of a colour', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['a1', { color: 'w', role: 'k' }],
      ['e8', { color: 'b', role: 'k' }],
    ])
    const status = classifyPosition(pieces, 'w')
    expect(status).toEqual({ kind: 'illegal', reason: 'White has more than one king.' })
  })

  it('rejects a pawn on the back rank', () => {
    const pieces = board([
      ['a1', { color: 'w', role: 'p' }],
      ['e1', { color: 'w', role: 'k' }],
      ['e8', { color: 'b', role: 'k' }],
    ])
    const status = classifyPosition(pieces, 'w')
    expect(status.kind).toBe('illegal')
    if (status.kind === 'illegal') expect(status.reason).toMatch(/first or last rank/)
  })

  it('rejects a position where the side not to move is in check', () => {
    // White rook on e7 attacks the black king on e8, but it is White to move.
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['e7', { color: 'w', role: 'r' }],
      ['e8', { color: 'b', role: 'k' }],
    ])
    const status = classifyPosition(pieces, 'w')
    expect(status.kind).toBe('illegal')
    if (status.kind === 'illegal') expect(status.reason).toMatch(/Black is in check/)
  })

  it('detects checkmate and names the winner', () => {
    // Fool's mate: White is checkmated with White to move.
    const pieces = boardFromPlacement('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR')
    expect(classifyPosition(pieces, 'w')).toEqual({ kind: 'checkmate', winner: 'b' })
  })

  it('detects stalemate', () => {
    // Black to move, king on h8 boxed in but not in check.
    const pieces = boardFromPlacement('7k/5Q2/6K1/8/8/8/8/8')
    expect(classifyPosition(pieces, 'b')).toEqual({ kind: 'stalemate' })
  })

  it('rejects adjacent kings', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['e2', { color: 'b', role: 'k' }],
    ])
    expect(classifyPosition(pieces, 'w').kind).toBe('illegal')
  })

  it('allows the side to move to be in check', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['e7', { color: 'b', role: 'r' }],
      ['e8', { color: 'b', role: 'k' }],
    ])
    // Black rook checks the white king; it is White to move, which is legal.
    expect(classifyPosition(pieces, 'w').kind).toBe('legal')
  })

  it('carries the en passant square into the legal FEN for the engine', () => {
    const pieces = board([
      ['e1', { color: 'w', role: 'k' }],
      ['e8', { color: 'b', role: 'k' }],
      ['e5', { color: 'w', role: 'p' }],
      ['d5', { color: 'b', role: 'p' }],
    ])
    const status = classifyPosition(pieces, 'w', 'd6')
    expect(status.kind).toBe('legal')
    if (status.kind === 'legal') expect(status.fen).toContain(' w - d6 ')
  })
})
