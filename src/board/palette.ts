import type { Color, Role } from '../chess/types.ts'
import type { DragController } from './dnd.ts'
import type { Orientation } from './types.ts'
import { pieceLabel, pieceUrl } from './pieces.ts'
import './palette.css'

const ROLES: Role[] = ['k', 'q', 'r', 'b', 'n', 'p']

/** The two spare-piece groups. Their order follows the board orientation, so the
    colour sitting at the bottom of the board is the lower group. */
export class Palette {
  private readonly root: HTMLElement
  private readonly drag: DragController
  private orientation: Orientation = 'white'

  constructor(root: HTMLElement, drag: DragController) {
    this.root = root
    this.drag = drag
    this.render()
  }

  setOrientation(orientation: Orientation): void {
    if (orientation === this.orientation) return
    this.orientation = orientation
    this.render()
  }

  private render(): void {
    const bottom: Color = this.orientation === 'white' ? 'w' : 'b'
    const top: Color = bottom === 'w' ? 'b' : 'w'
    this.root.replaceChildren(this.group(top), this.group(bottom))
  }

  private group(color: Color): HTMLElement {
    const group = document.createElement('div')
    group.className = 'palette-group'

    const heading = document.createElement('p')
    heading.className = 'pgroup-label'
    heading.textContent = color === 'w' ? 'White' : 'Black'

    const swatches = document.createElement('div')
    swatches.className = 'swatches'
    for (const role of ROLES) swatches.append(this.swatch(color, role))

    group.append(heading, swatches)
    return group
  }

  private swatch(color: Color, role: Role): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'swatch'
    // Editing is pointer-only. The swatch is a drag source, so it stays out of
    // the keyboard tab order.
    button.tabIndex = -1
    button.setAttribute('aria-label', pieceLabel(color, role))

    const img = document.createElement('img')
    img.src = pieceUrl(color, role)
    img.alt = ''
    img.draggable = false
    button.append(img)

    button.addEventListener('pointerdown', (event) => {
      this.drag.beginFromPalette(event, button, { color, role })
    })
    return button
  }
}
