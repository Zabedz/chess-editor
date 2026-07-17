import type { Piece, Square } from '../chess/types.ts'
import type { BoardModel } from './model.ts'
import { pieceUrl } from './pieces.ts'
import './dnd.css'

// Fallback ghost size when the board has not been laid out yet.
const DEFAULT_SQUARE_PX = 56

type DragSource =
  | { kind: 'palette'; piece: Piece }
  | { kind: 'board'; square: Square; piece: Piece }

interface ActiveDrag {
  source: DragSource
  pointerId: number
  captureEl: HTMLElement
  ghost: HTMLImageElement
  ghostSize: number
  onMove: (event: PointerEvent) => void
  onEnd: (event: PointerEvent) => void
}

/** One pointer-driven controller for all three edit gestures: drag a palette
    swatch onto a square (place), drag a board piece to another square (move),
    and drag a board piece off the board (remove). The model changes only on
    drop, so the evaluation sees the settled position. */
export class DragController {
  private readonly model: BoardModel
  private readonly boardRoot: HTMLElement
  private active: ActiveDrag | null = null

  constructor(model: BoardModel, boardRoot: HTMLElement) {
    this.model = model
    this.boardRoot = boardRoot
  }

  /** Listens for drags that start on a board piece. */
  attach(): void {
    this.boardRoot.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Element)) return
      const squareEl = event.target.closest<HTMLElement>('[data-square]')
      if (!squareEl || !this.boardRoot.contains(squareEl)) return
      const square = squareEl.dataset.square as Square
      const piece = this.model.get(square)
      if (!piece) return
      this.begin(event, squareEl, { kind: 'board', square, piece })
    })
  }

  /** Starts a drag from an off-board source such as a palette swatch. */
  beginFromPalette(event: PointerEvent, from: HTMLElement, piece: Piece): void {
    this.begin(event, from, { kind: 'palette', piece })
  }

  private begin(event: PointerEvent, captureEl: HTMLElement, source: DragSource): void {
    if (this.active) return
    if (event.button !== 0) return // primary button (and touch/pen) only
    event.preventDefault()

    const ghostSize = this.squareSize()
    const ghost = createGhost(source.piece, ghostSize)
    positionGhost(ghost, event.clientX, event.clientY, ghostSize)

    try {
      captureEl.setPointerCapture(event.pointerId)
    } catch {
      // Capture is best effort; the window listeners still track the pointer.
    }

    if (source.kind === 'board') {
      this.squareEl(source.square)?.classList.add('dragging')
    }

    const onMove = (moveEvent: PointerEvent) => this.onMove(moveEvent)
    const onEnd = (endEvent: PointerEvent) => this.onEnd(endEvent)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)

    this.active = { source, pointerId: event.pointerId, captureEl, ghost, ghostSize, onMove, onEnd }
  }

  private onMove(event: PointerEvent): void {
    const active = this.active
    if (!active || event.pointerId !== active.pointerId) return
    positionGhost(active.ghost, event.clientX, event.clientY, active.ghostSize)
  }

  private onEnd(event: PointerEvent): void {
    const active = this.active
    if (!active || event.pointerId !== active.pointerId) return

    const cancelled = event.type === 'pointercancel'
    const target = cancelled
      ? null
      : this.squareFrom(document.elementFromPoint(event.clientX, event.clientY))

    window.removeEventListener('pointermove', active.onMove)
    window.removeEventListener('pointerup', active.onEnd)
    window.removeEventListener('pointercancel', active.onEnd)
    try {
      active.captureEl.releasePointerCapture(event.pointerId)
    } catch {
      // Capture may already be gone; nothing to release.
    }
    active.ghost.remove()
    if (active.source.kind === 'board') {
      this.squareEl(active.source.square)?.classList.remove('dragging')
    }
    this.active = null

    if (!cancelled) this.applyDrop(active.source, target)
  }

  private applyDrop(source: DragSource, target: Square | null): void {
    if (source.kind === 'palette') {
      if (target) this.model.put(target, source.piece)
      return
    }
    if (target) this.model.move(source.square, target)
    else this.model.remove(source.square)
  }

  private squareFrom(node: Element | null): Square | null {
    const el = node?.closest<HTMLElement>('[data-square]')
    if (!el || !this.boardRoot.contains(el)) return null
    return (el.dataset.square ?? null) as Square | null
  }

  private squareEl(square: Square): HTMLElement | null {
    return this.boardRoot.querySelector<HTMLElement>(`[data-square="${square}"]`)
  }

  private squareSize(): number {
    const square = this.boardRoot.querySelector('.square')
    return square ? Math.round(square.getBoundingClientRect().width) : DEFAULT_SQUARE_PX
  }
}

function createGhost(piece: Piece, size: number): HTMLImageElement {
  const ghost = document.createElement('img')
  ghost.className = 'drag-ghost'
  ghost.src = pieceUrl(piece.color, piece.role)
  ghost.alt = ''
  ghost.setAttribute('aria-hidden', 'true')
  ghost.draggable = false
  ghost.style.width = `${size}px`
  ghost.style.height = `${size}px`
  document.body.append(ghost)
  return ghost
}

function positionGhost(ghost: HTMLElement, x: number, y: number, size: number): void {
  ghost.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`
}
