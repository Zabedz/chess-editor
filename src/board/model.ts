import type { Color, Piece, Square } from '../chess/types.ts'
import { boardFromPlacement, START_FEN, toFen } from '../chess/fen.ts'

type Listener = () => void

const START_PLACEMENT = START_FEN.split(' ')[0]

/** Holds the edited position: which piece sits on each square and whose turn it
    is. Mutations notify subscribers so the view and the evaluation can react. */
export class BoardModel {
  private pieces = new Map<Square, Piece>()
  private turn: Color = 'w'
  private readonly listeners = new Set<Listener>()

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

  put(square: Square, piece: Piece): void {
    const existing = this.pieces.get(square)
    if (existing && existing.color === piece.color && existing.role === piece.role) return
    this.pieces.set(square, piece)
    this.emit()
  }

  remove(square: Square): void {
    if (this.pieces.delete(square)) this.emit()
  }

  move(from: Square, to: Square): void {
    if (from === to) return
    const piece = this.pieces.get(from)
    if (!piece) return
    this.pieces.delete(from)
    this.pieces.set(to, piece)
    this.emit()
  }

  clear(): void {
    if (this.pieces.size === 0) return
    this.pieces.clear()
    this.emit()
  }

  /** Restores the standard starting position with White to move. */
  reset(): void {
    this.loadStart()
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

  private loadStart(): void {
    this.pieces = boardFromPlacement(START_PLACEMENT)
    this.turn = 'w'
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
