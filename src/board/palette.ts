import type { Color, Role } from '../chess/types.ts'
import type { DragController } from './dnd.ts'
import { pieceLabel, pieceUrl } from './pieces.ts'
import './palette.css'

const ROLES: Role[] = ['k', 'q', 'r', 'b', 'n', 'p']
const GROUPS: Array<{ color: Color; label: string }> = [
  { color: 'w', label: 'White' },
  { color: 'b', label: 'Black' },
]

/** Renders the two spare-piece groups into the palette container and wires each
    swatch to start a drag. */
export function mountPalette(root: HTMLElement, drag: DragController): void {
  const groups = GROUPS.map(({ color, label }) => {
    const group = document.createElement('div')
    group.className = 'palette-group'

    const heading = document.createElement('p')
    heading.className = 'pgroup-label'
    heading.textContent = label

    const swatches = document.createElement('div')
    swatches.className = 'swatches'
    for (const role of ROLES) swatches.append(createSwatch(color, role, drag))

    group.append(heading, swatches)
    return group
  })
  root.replaceChildren(...groups)
}

function createSwatch(color: Color, role: Role, drag: DragController): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'swatch'
  button.setAttribute('aria-label', pieceLabel(color, role))

  const img = document.createElement('img')
  img.src = pieceUrl(color, role)
  img.alt = ''
  img.draggable = false
  button.append(img)

  button.addEventListener('pointerdown', (event) => {
    drag.beginFromPalette(event, button, { color, role })
  })
  return button
}
