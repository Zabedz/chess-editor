import type { Settings } from '../settings/settings.ts'

/** Reflects the visual settings onto the document root, where the token and
    board CSS pick them up (board colours, coordinates, and highlight). */
export function applyVisuals(settings: Settings): void {
  const root = document.documentElement
  root.dataset.board = settings.boardTheme
  root.dataset.coords = settings.coordinates ? 'on' : 'off'
  root.dataset.highlight = settings.highlight ? 'on' : 'off'
}
