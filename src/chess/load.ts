import { Chess } from 'chess.js'
import type { Color, Piece, Square } from './types.ts'
import { boardFromPlacement } from './fen.ts'

export interface ParsedPosition {
  pieces: Map<Square, Piece>
  turn: Color
}

export type LoadResult =
  | { ok: true; position: ParsedPosition }
  | { ok: false; error: string }

/** Reads a position from a FEN or a PGN. A FEN is recognised by the slashes in
    its placement field; anything else is played out as a PGN and reduced to its
    final position. Castling and en passant are dropped, since the editor tracks
    neither. */
export function loadPosition(input: string): LoadResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Enter a FEN or PGN to load.' }
  return text.split(/\s+/)[0].includes('/') ? fromFen(text) : fromPgn(text)
}

function fromFen(fen: string): LoadResult {
  const fields = fen.split(/\s+/)
  const side = fields[1] ?? 'w'
  if (side !== 'w' && side !== 'b') {
    return { ok: false, error: `FEN side to move must be w or b, got "${side}".` }
  }
  try {
    return { ok: true, position: { pieces: boardFromPlacement(fields[0]), turn: side } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'That FEN is not valid.' }
  }
}

function fromPgn(pgn: string): LoadResult {
  const game = new Chess()
  try {
    game.loadPgn(pgn)
  } catch {
    return { ok: false, error: 'Could not read that as a FEN or PGN.' }
  }
  const [placement, side] = game.fen().split(' ')
  return {
    ok: true,
    position: { pieces: boardFromPlacement(placement), turn: side === 'b' ? 'b' : 'w' },
  }
}
