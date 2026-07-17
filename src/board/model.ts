import type { Color, Piece, Role, Square } from '../chess/types.ts'
import { boardFromPlacement, START_FEN, toFen } from '../chess/fen.ts'

type Listener = () => void

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
    this.emit()
  }

  remove(square: Square): void {
    if (!this.pieces.has(square)) return
    this.record()
    this.pieces.delete(square)
    this.emit()
  }

  /** Relocates a piece and flips the side to move, so playing a move alternates
      the turn. Pass a promotion role to land a different piece on the target,
      as when the engine's best move promotes a pawn; a drag omits it. */
  move(from: Square, to: Square, promotion?: Role): void {
    if (from === to) return
    const piece = this.pieces.get(from)
    if (!piece) return
    this.record()
    this.pieces.delete(from)
    this.pieces.set(to, promotion ? { color: piece.color, role: promotion } : piece)
    this.turn = this.turn === 'w' ? 'b' : 'w'
    this.emit()
  }

  clear(): void {
    if (this.pieces.size === 0) return
    this.record()
    this.pieces.clear()
    this.emit()
  }

  /** Restores the standard starting position with White to move. */
  reset(): void {
    if (this.fen() === START_FEN) return
    this.record()
    this.loadStart()
    this.emit()
  }

  /** Replaces the whole position, for loading a FEN or a PGN. */
  setPosition(pieces: ReadonlyMap<Square, Piece>, turn: Color): void {
    this.record()
    this.pieces = new Map(pieces)
    this.turn = turn
    this.emit()
  }

  /** Reverts the most recent piece or position edit. The turn toggle is not
      recorded, so it does not create its own undo step. */
  undo(): void {
    const previous = this.past.pop()
    if (!previous) return
    this.pieces = previous.pieces
    this.turn = previous.turn
    this.emit()
  }

  setTurn(color: Color): void {
    if (this.turn === color) return
    this.turn = color
    this.emit()
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

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
