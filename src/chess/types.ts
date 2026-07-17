export type Color = 'w' | 'b'
export type Role = 'k' | 'q' | 'r' | 'b' | 'n' | 'p'

export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
export type Square = `${File}${Rank}`

export interface Piece {
  color: Color
  role: Role
}
