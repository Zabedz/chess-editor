import type { Color, Piece, Role, Square } from '../chess/types.ts'
import { boardFromPlacement, START_FEN, toFen } from '../chess/fen.ts'

/** What a change was, so a subscriber (the sound player) can tell a capturing
    move from a quiet one. Every non-move edit is reported as 'edit'. */
export type Change = { kind: 'move'; capture: boolean } | { kind: 'edit' }

type Listener = (change: Change) => void

interface Snapshot {
  pieces: Map<Square, Piece>
  turn: Color
}

const START_PLACEMENT = START_FEN.split(' ')[0]
// Bound the undo history so a long editing session cannot grow it forever.
const MAX_HISTORY = 256

/** Holds the edited position: which piece sits on each square and whose turn it
    is. Mutations notify subscribers so the view and the evaluation can react.
    Piece and position edits are recorded so they can be undone. */
export class BoardModel {
  private pieces = new Map<Square, Piece>()
  private turn: Color = 'w'
  private readonly listeners = new Set<Listener>()
  private readonly past: Snapshot[] = []

  constructor() {
    this.loadStart()
  }

  getPieces(): ReadonlyMap<Square, Piece> {
    return this.pieces
  }

  get(square: Square): Piece | undefined {
    return this.pieces.get(square)
  }

  getTurn(): Color {
    return this.turn
  }

  fen(): string {
    return toFen(this.pieces, this.turn)
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  put(square: Square, piece: Piece): void {
    const existing = this.pieces.get(square)
    if (existing && existing.color === piece.color && existing.role === piece.role) return
    this.record()
    this.pieces.set(square, piece)
    this.emit({ kind: 'edit' })
  }

  remove(square: Square): void {
    if (!this.pieces.has(square)) return
    this.record()
    this.pieces.delete(square)
    this.emit({ kind: 'edit' })
  }

  /** Relocates a piece and flips the side to move, so playing a move alternates
      the turn. A king's two-square home-rank move toward a friendly corner rook,
      with the squares it crosses empty, castles: the rook hops to the king's
      far side in the same undoable step. Pass a promotion role to land a
      different piece on the target, as when the engine's best move promotes a
      pawn; a drag omits it. */
  move(from: Square, to: Square, promotion?: Role): void {
    if (from === to) return
    const piece = this.pieces.get(from)
    if (!piece) return
    const rookHop = castleRookHop(piece, from, to, this.pieces)
    const capture = this.pieces.has(to)
    this.record()
    this.pieces.delete(from)
    this.pieces.set(to, promotion ? { color: piece.color, role: promotion } : piece)
    if (rookHop) {
      this.pieces.delete(rookHop.from)
      this.pieces.set(rookHop.to, { color: piece.color, role: 'r' })
    }
    this.turn = this.turn === 'w' ? 'b' : 'w'
    this.emit({ kind: 'move', capture })
  }

  clear(): void {
    if (this.pieces.size === 0) return
    this.record()
    this.pieces.clear()
    this.emit({ kind: 'edit' })
  }

  /** Restores the standard starting position with White to move. */
  reset(): void {
    if (this.fen() === START_FEN) return
    this.record()
    this.loadStart()
    this.emit({ kind: 'edit' })
  }

  /** Replaces the whole position, for loading a FEN or a PGN. */
  setPosition(pieces: ReadonlyMap<Square, Piece>, turn: Color): void {
    this.record()
    this.pieces = new Map(pieces)
    this.turn = turn
    this.emit({ kind: 'edit' })
  }

  /** Reverts the most recent piece or position edit. The turn toggle is not
      recorded, so it does not create its own undo step. */
  undo(): void {
    const previous = this.past.pop()
    if (!previous) return
    this.pieces = previous.pieces
    this.turn = previous.turn
    this.emit({ kind: 'edit' })
  }

  setTurn(color: Color): void {
    if (this.turn === color) return
    this.turn = color
    this.emit({ kind: 'edit' })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private record(): void {
    this.past.push({ pieces: new Map(this.pieces), turn: this.turn })
    if (this.past.length > MAX_HISTORY) this.past.shift()
  }

  private loadStart(): void {
    this.pieces = boardFromPlacement(START_PLACEMENT)
    this.turn = 'w'
  }

  private emit(change: Change): void {
    for (const listener of this.listeners) listener(change)
  }
}

/** The rook's move for a castle, or null when the king move is not one. It is a
    castle when the king starts on its home square (e1 or e8) and moves two files
    to g or c, a friendly rook stands on the matching corner, and the squares the
    king and rook cross are empty. Returning null for every other king move keeps
    ordinary moves and free-form edits untouched. Standard chess only: the home
    squares and corners are fixed, so Chess960 castles are read as plain moves. */
function castleRookHop(
  king: Piece,
  from: Square,
  to: Square,
  pieces: ReadonlyMap<Square, Piece>,
): { from: Square; to: Square } | null {
  if (king.role !== 'k') return null
  const rank = king.color === 'w' ? '1' : '8'
  if (from !== `e${rank}`) return null

  const empty = (file: string): boolean => !pieces.has(`${file}${rank}` as Square)
  const rookAt = (file: string): boolean =>
    isRook(pieces.get(`${file}${rank}` as Square), king.color)

  if (to === `g${rank}` && rookAt('h') && empty('f') && empty('g')) {
    return { from: `h${rank}` as Square, to: `f${rank}` as Square }
  }
  if (to === `c${rank}` && rookAt('a') && empty('b') && empty('c') && empty('d')) {
    return { from: `a${rank}` as Square, to: `d${rank}` as Square }
  }
  return null
}

function isRook(piece: Piece | undefined, color: Color): boolean {
  return piece !== undefined && piece.role === 'r' && piece.color === color
}
