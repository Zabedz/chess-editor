import type { Color, Role } from '../chess/types.ts'

// cburnett filenames use an uppercase role letter: wK.svg, bN.svg, and so on.
export function pieceUrl(color: Color, role: Role): string {
  return `/pieces/cburnett/${color}${role.toUpperCase()}.svg`
}
