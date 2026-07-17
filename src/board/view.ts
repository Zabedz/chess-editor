import type { Square } from '../chess/types.ts'
import type { BoardModel } from './model.ts'
import type { Orientation } from './types.ts'
import { pieceLabel, pieceUrl } from './pieces.ts'
import './board.css'

export interface Highlight {
  from: Square | null
  to: Square | null
  path: readonly Square[]
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const EMPTY_HIGHLIGHT: Highlight = { from: null, to: null, path: [] }

/** Draws the board from the model. Each model change diffs piece contents, and
    the suggested-move highlight is applied separately so the engine result does
    not force a piece re-render. Flipping rebuilds the grid in the reversed order
    and re-applies the current pieces and highlight. */
export class BoardView {
  private readonly root: HTMLElement
  private readonly model: BoardModel
  private readonly squares = new Map<Square, HTMLElement>()
  private orientation: Orientation = 'white'
  private highlight: Highlight = EMPTY_HIGHLIGHT

  constructor(root: HTMLElement, model: BoardModel) {
    this.root = root
    this.model = model
    this.buildGrid()
    this.renderPieces()
    model.subscribe(() => this.renderPieces())
  }

  /** Puts the given colour at the bottom of the board. */
  setOrientation(orientation: Orientation): void {
    if (orientation === this.orientation) return
    this.orientation = orientation
    this.buildGrid()
    this.renderPieces()
    this.setHighlight(this.highlight)
  }

  setHighlight(highlight: Highlight): void {
    this.highlight = highlight
    for (const [square, el] of this.squares) {
      el.classList.toggle('hl-from', square === highlight.from)
      el.classList.toggle('hl-to', square === highlight.to)
      el.classList.toggle('hl-path', highlight.path.includes(square))
    }
  }

  clearHighlight(): void {
    this.setHighlight(EMPTY_HIGHLIGHT)
  }

  private buildGrid(): void {
    this.root.classList.add('board')
    this.squares.clear()
    const ranks = this.orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
    const files = this.orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]

    const fragment = document.createDocumentFragment()
    for (let row = 0; row < 8; row++) {
      const rank = ranks[row]
      for (let col = 0; col < 8; col++) {
        const fileIndex = files[col]
        const square = `${FILES[fileIndex]}${rank}` as Square
        const el = document.createElement('div')
        el.className = `square ${(fileIndex + rank) % 2 === 0 ? 'light' : 'dark'}`
        el.dataset.square = square
        if (row === 7) el.append(coordEl('file', FILES[fileIndex]))
        if (col === 0) el.append(coordEl('rank', String(rank)))
        this.squares.set(square, el)
        fragment.append(el)
      }
    }
    this.root.replaceChildren(fragment)
  }

  // Must not touch a square's classList: the suggested-move highlight lives
  // there (hl-from / hl-path / hl-to) and has to survive piece re-renders.
  private renderPieces(): void {
    for (const [square, el] of this.squares) {
      const piece = this.model.get(square)
      const key = piece ? `${piece.color}${piece.role}` : ''
      if (el.dataset.piece === key) continue
      el.dataset.piece = key

      let img = el.querySelector<HTMLImageElement>('img.piece')
      if (!piece) {
        img?.remove()
        continue
      }
      if (!img) {
        img = document.createElement('img')
        img.className = 'piece'
        img.draggable = false
        el.append(img)
      }
      img.src = pieceUrl(piece.color, piece.role)
      img.alt = pieceLabel(piece.color, piece.role)
    }
  }
}

function coordEl(kind: 'file' | 'rank', label: string): HTMLElement {
  const span = document.createElement('span')
  span.className = `coord ${kind}`
  span.textContent = label
  span.setAttribute('aria-hidden', 'true')
  return span
}
