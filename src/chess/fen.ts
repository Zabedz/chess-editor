import type { Color, Piece, Role, Square } from './types.ts'

export const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const ROLE_CHARS = new Set<Role>(['k', 'q', 'r', 'b', 'n', 'p'])

/** The piece-placement field: ranks 8 down to 1, empty runs as digits. */
export function placementFromBoard(pieces: ReadonlyMap<Square, Piece>): string {
  const rows: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    let row = ''
    let empty = 0
    for (const file of FILES) {
      const piece = pieces.get(`${file}${rank}` as Square)
      if (!piece) {
        empty++
        continue
      }
      if (empty > 0) {
        row += empty
        empty = 0
      }
      row += piece.color === 'w' ? piece.role.toUpperCase() : piece.role
    }
    if (empty > 0) row += empty
    rows.push(row)
  }
  return rows.join('/')
}

/** Parses a piece-placement field into a square-to-piece map. */
export function boardFromPlacement(placement: string): Map<Square, Piece> {
  const rows = placement.split('/')
  if (rows.length !== 8) {
    throw new Error(`FEN placement needs 8 ranks, got ${rows.length}: ${placement}`)
  }

  const pieces = new Map<Square, Piece>()
  for (let i = 0; i < 8; i++) {
    const rank = 8 - i
    let fileIndex = 0
    for (const ch of rows[i]) {
      if (ch >= '1' && ch <= '8') {
        fileIndex += Number(ch)
        continue
      }
      if (fileIndex > 7) {
        throw new Error(`FEN rank ${rank} overflows past the h file: ${rows[i]}`)
      }
      const role = ch.toLowerCase() as Role
      if (!ROLE_CHARS.has(role)) {
        throw new Error(`invalid FEN piece character: ${ch}`)
      }
      const color: Color = ch === ch.toUpperCase() ? 'w' : 'b'
      pieces.set(`${FILES[fileIndex]}${rank}` as Square, { color, role })
      fileIndex++
    }
    if (fileIndex !== 8) {
      throw new Error(`FEN rank ${rank} does not fill 8 files: ${rows[i]}`)
    }
  }
  return pieces
}

/** Infers castling rights from king and rook home squares (the editor cannot
    know rights otherwise; en passant is always cleared). */
export function inferCastling(pieces: ReadonlyMap<Square, Piece>): string {
  let rights = ''
  if (isPiece(pieces.get('e1'), 'w', 'k')) {
    if (isPiece(pieces.get('h1'), 'w', 'r')) rights += 'K'
    if (isPiece(pieces.get('a1'), 'w', 'r')) rights += 'Q'
  }
  if (isPiece(pieces.get('e8'), 'b', 'k')) {
    if (isPiece(pieces.get('h8'), 'b', 'r')) rights += 'k'
    if (isPiece(pieces.get('a8'), 'b', 'r')) rights += 'q'
  }
  return rights === '' ? '-' : rights
}

/** Assembles a full FEN. En passant is cleared and the move clocks are fixed,
    since an edited position carries no move history. */
export function toFen(pieces: ReadonlyMap<Square, Piece>, turn: Color): string {
  return `${placementFromBoard(pieces)} ${turn} ${inferCastling(pieces)} - 0 1`
}

function isPiece(
  piece: Piece | undefined,
  color: Color,
  role: Role,
): boolean {
  return piece !== undefined && piece.color === color && piece.role === role
}
