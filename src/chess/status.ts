import { Chess } from 'chess.js'
import type { Color, Piece, Square } from './types.ts'
import { toFen } from './fen.ts'

export type PositionStatus =
  | { kind: 'empty' }
  | { kind: 'illegal'; reason: string }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'legal'; fen: string }

/** Classifies an edited position. Legality checks that a search engine needs
    (one king per side, no back-rank pawns, the side not to move is not left in
    check) are done here; chess.js supplies check, checkmate, and stalemate. */
export function classifyPosition(
  pieces: ReadonlyMap<Square, Piece>,
  turn: Color,
  enPassant: Square | null = null,
): PositionStatus {
  if (pieces.size === 0) return { kind: 'empty' }

  const kings = countKings(pieces)
  if (kings.w !== 1) return { kind: 'illegal', reason: kingReason('w', kings.w) }
  if (kings.b !== 1) return { kind: 'illegal', reason: kingReason('b', kings.b) }

  if (hasBackRankPawn(pieces)) {
    return { kind: 'illegal', reason: 'Pawns cannot stand on the first or last rank.' }
  }

  const opponent = other(turn)
  if (new Chess(toFen(pieces, opponent), { skipValidation: true }).inCheck()) {
    return {
      kind: 'illegal',
      reason: `${colorName(opponent)} is in check while it is ${colorName(turn)} to move.`,
    }
  }

  const fen = toFen(pieces, turn, enPassant)
  const game = new Chess(fen, { skipValidation: true })
  if (game.isCheckmate()) return { kind: 'checkmate', winner: opponent }
  if (game.isStalemate()) return { kind: 'stalemate' }
  return { kind: 'legal', fen }
}

function countKings(pieces: ReadonlyMap<Square, Piece>): { w: number; b: number } {
  const kings = { w: 0, b: 0 }
  for (const piece of pieces.values()) {
    if (piece.role === 'k') kings[piece.color]++
  }
  return kings
}

function hasBackRankPawn(pieces: ReadonlyMap<Square, Piece>): boolean {
  for (const [square, piece] of pieces) {
    if (piece.role === 'p' && (square[1] === '1' || square[1] === '8')) return true
  }
  return false
}

function other(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function colorName(color: Color): string {
  return color === 'w' ? 'White' : 'Black'
}

function kingReason(color: Color, count: number): string {
  const name = colorName(color)
  return count === 0 ? `${name} has no king.` : `${name} has more than one king.`
}
