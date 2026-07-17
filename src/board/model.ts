import type { Color, Piece, Role, Square } from '../chess/types.ts'
import { boardFromPlacement, START_FEN, toFen } from '../chess/fen.ts'

/** What a change was, so a subscriber (the sound player) can tell a capturing
    move from a quiet one. Every non-move edit is reported as 'edit'. */
export type Change = { kind: 'move'; capture: boolean } | { kind: 'edit' }

type Listener = (change: Change) => void

interface Snapshot {
  pieces: Map<Square, Piece>
  turn: Color
  enPassant: Square | null
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
  // The square a pawn may capture onto by en passant this move (the square the
  // last double-stepping pawn skipped), or null. It rides in the FEN so the
  // engine can see and play the capture, and it is snapshotted for undo.
  private enPassant: Square | null = null
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

  getEnPassant(): Square | null {
    return this.enPassant
  }

  fen(): string {
    return toFen(this.pieces, this.turn, this.enPassant)
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  put(square: Square, piece: Piece): void {
    const existing = this.pieces.get(square)
    if (existing && existing.color === piece.color && existing.role === piece.role) return
    this.record()
    this.pieces.set(square, piece)
    this.enPassant = null
    this.emit({ kind: 'edit' })
  }

  remove(square: Square): void {
    if (!this.pieces.has(square)) return
    this.record()
    this.pieces.delete(square)
    this.enPassant = null
    this.emit({ kind: 'edit' })
  }

  /** Relocates a piece and flips the side to move, so playing a move alternates
      the turn. A king's two-square home-rank move toward a friendly corner rook,
      with the squares it crosses empty, castles: the rook hops to the king's
      far side in the same undoable step. A pawn stepping diagonally onto the en
      passant square captures the pawn beside it, removed in the same step, and a
      two-step pawn move sets the next en passant square when an enemy pawn can
      take it. Pass a promotion role to land a different piece on the target, as
      when the engine's best move promotes a pawn; a drag omits it. */
  move(from: Square, to: Square, promotion?: Role): void {
    if (from === to) return
    const piece = this.pieces.get(from)
    if (!piece) return
    const rookHop = castleRookHop(piece, from, to, this.pieces)
    const epCapture = enPassantCapture(piece, from, to, this.enPassant, this.pieces)
    const capture = this.pieces.has(to) || epCapture !== null
    this.record()
    this.pieces.delete(from)
    this.pieces.set(to, promotion ? { color: piece.color, role: promotion } : piece)
    if (epCapture) this.pieces.delete(epCapture)
    if (rookHop) {
      this.pieces.delete(rookHop.from)
      this.pieces.set(rookHop.to, { color: piece.color, role: 'r' })
    }
    this.enPassant = doublePushTarget(piece, from, to, this.pieces)
    this.turn = this.turn === 'w' ? 'b' : 'w'
    this.emit({ kind: 'move', capture })
  }

  clear(): void {
    if (this.pieces.size === 0) return
    this.record()
    this.pieces.clear()
    this.enPassant = null
    this.emit({ kind: 'edit' })
  }

  /** Restores the standard starting position with White to move. */
  reset(): void {
    if (this.fen() === START_FEN) return
    this.record()
    this.loadStart()
    this.emit({ kind: 'edit' })
  }

  /** Replaces the whole position, for loading a FEN or a PGN. The en passant
      square comes from the loaded position, or null when it had none. */
  setPosition(
    pieces: ReadonlyMap<Square, Piece>,
    turn: Color,
    enPassant: Square | null = null,
  ): void {
    this.record()
    this.pieces = new Map(pieces)
    this.turn = turn
    this.enPassant = enPassant
    this.emit({ kind: 'edit' })
  }

  /** Reverts the most recent piece or position edit. The turn toggle is not
      recorded, so it does not create its own undo step. */
  undo(): void {
    const previous = this.past.pop()
    if (!previous) return
    this.pieces = previous.pieces
    this.turn = previous.turn
    this.enPassant = previous.enPassant
    this.emit({ kind: 'edit' })
  }

  setTurn(color: Color): void {
    if (this.turn === color) return
    this.turn = color
    this.enPassant = null
    this.emit({ kind: 'edit' })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private record(): void {
    this.past.push({ pieces: new Map(this.pieces), turn: this.turn, enPassant: this.enPassant })
    if (this.past.length > MAX_HISTORY) this.past.shift()
  }

  private loadStart(): void {
    this.pieces = boardFromPlacement(START_PLACEMENT)
    this.turn = 'w'
    this.enPassant = null
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

/** The square holding the pawn captured en passant by this move, or null when
    the move is not one. It is en passant when a pawn steps diagonally onto the
    empty en passant target and an enemy pawn sits beside the mover, on the
    mover's start rank; that pawn is the one removed. */
function enPassantCapture(
  pawn: Piece,
  from: Square,
  to: Square,
  target: Square | null,
  pieces: ReadonlyMap<Square, Piece>,
): Square | null {
  if (pawn.role !== 'p' || target === null || to !== target || pieces.has(to)) return null
  if (Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) !== 1) return null
  // Only a capture from the mover's own en passant rank counts: White steps from
  // rank 5 onto a rank-6 target, Black from rank 4 onto rank 3. The board allows
  // free-form drags, so without this a diagonal drop from another rank onto the
  // target would strip a pawn off the mover's start rank.
  const startRank = pawn.color === 'w' ? '5' : '4'
  const targetRank = pawn.color === 'w' ? '6' : '3'
  if (from[1] !== startRank || to[1] !== targetRank) return null
  const captured = `${to[0]}${from[1]}` as Square
  const victim = pieces.get(captured)
  return victim && victim.role === 'p' && victim.color !== pawn.color ? captured : null
}

/** The en passant square a two-step pawn move opens, or null. Standard chess
    only: a pawn from its home rank to two squares ahead. The square is exposed
    only when an enemy pawn stands beside the landing square and could take it,
    so the FEN never carries an en passant target that cannot be used. */
function doublePushTarget(
  pawn: Piece,
  from: Square,
  to: Square,
  pieces: ReadonlyMap<Square, Piece>,
): Square | null {
  if (pawn.role !== 'p' || from[0] !== to[0]) return null
  let target: Square | null = null
  if (pawn.color === 'w' && from[1] === '2' && to[1] === '4') target = `${from[0]}3` as Square
  else if (pawn.color === 'b' && from[1] === '7' && to[1] === '5') target = `${from[0]}6` as Square
  if (target === null) return null
  return enemyPawnBeside(to, pawn.color, pieces) ? target : null
}

function enemyPawnBeside(
  square: Square,
  mover: Color,
  pieces: ReadonlyMap<Square, Piece>,
): boolean {
  const rank = square[1]
  for (const step of [-1, 1]) {
    const beside = pieces.get(`${String.fromCharCode(square.charCodeAt(0) + step)}${rank}` as Square)
    if (beside && beside.role === 'p' && beside.color !== mover) return true
  }
  return false
}
