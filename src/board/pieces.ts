import type { Color, Role } from '../chess/types.ts'

// cburnett filenames use an uppercase role letter: wK.svg, bN.svg, and so on.
// BASE_URL prefixes the public base so the paths hold under a non-root base as
// well as at the root.
export function pieceUrl(color: Color, role: Role): string {
  return `${import.meta.env.BASE_URL}pieces/cburnett/${color}${role.toUpperCase()}.svg`
}

const ROLE_NAME: Record<Role, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
}

/** A spoken label such as "white king", for image alt text and aria labels. */
export function pieceLabel(color: Color, role: Role): string {
  return `${color === 'w' ? 'white' : 'black'} ${ROLE_NAME[role]}`
}
