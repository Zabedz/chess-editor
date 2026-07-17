import { Chess } from 'chess.js'
import type { Color, Piece, Square } from './types.ts'
import { boardFromPlacement } from './fen.ts'

export interface ParsedPosition {
  pieces: Map<Square, Piece>
  turn: Color
  enPassant: Square | null
}

export type LoadResult =
  | { ok: true; position: ParsedPosition }
  | { ok: false; error: string }

/** Reads a position from a FEN or a PGN. A FEN is recognised by the slashes in
    its placement field; anything else is played out as a PGN and reduced to its
    final position. Castling rights are re-derived from the placement later; the
    en passant square is read from the FEN field or the PGN's final position. */
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
    return {
      ok: true,
      position: {
        pieces: boardFromPlacement(fields[0]),
        turn: side,
        enPassant: parseEnPassant(fields[3]),
      },
    }
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
  const [placement, side, , enPassant] = game.fen().split(' ')
  return {
    ok: true,
    position: {
      pieces: boardFromPlacement(placement),
      turn: side === 'b' ? 'b' : 'w',
      enPassant: parseEnPassant(enPassant),
    },
  }
}

/** The en passant square from a FEN field, or null when it is "-" or missing. A
    stray or malformed value is dropped and the load still succeeds. */
function parseEnPassant(field: string | undefined): Square | null {
  return field !== undefined && /^[a-h][36]$/.test(field) ? (field as Square) : null
}
