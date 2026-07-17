import type { Square } from '../chess/types.ts'
import type { BoardModel } from './model.ts'
import { pieceLabel, pieceUrl } from './pieces.ts'
import './board.css'

export interface Highlight {
  from: Square | null
  to: Square | null
  path: readonly Square[]
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

/** Draws the board from the model. The 64 squares are built once; each model
    change diffs piece contents, and the suggested-move highlight is applied
    separately so the engine result does not force a piece re-render. */
export class BoardView {
  private readonly root: HTMLElement
  private readonly model: BoardModel
  private readonly squares = new Map<Square, HTMLElement>()

  constructor(root: HTMLElement, model: BoardModel) {
    this.root = root
    this.model = model
    this.buildGrid()
    this.renderPieces()
    model.subscribe(() => this.renderPieces())
  }

  setHighlight(highlight: Highlight): void {
    for (const [square, el] of this.squares) {
      el.classList.toggle('hl-from', square === highlight.from)
      el.classList.toggle('hl-to', square === highlight.to)
      el.classList.toggle('hl-path', highlight.path.includes(square))
    }
  }

  clearHighlight(): void {
    this.setHighlight({ from: null, to: null, path: [] })
  }

  private buildGrid(): void {
    this.root.classList.add('board')
    const fragment = document.createDocumentFragment()
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      const rank = 8 - rankIndex
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const square = `${FILES[fileIndex]}${rank}` as Square
        const el = document.createElement('div')
        el.className = `square ${(fileIndex + rankIndex) % 2 === 0 ? 'light' : 'dark'}`
        el.dataset.square = square
        if (rank === 1) el.append(coordEl('file', FILES[fileIndex]))
        if (fileIndex === 0) el.append(coordEl('rank', String(rank)))
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
