import { describe, expect, it } from 'vitest'
import { START_FEN, placementFromBoard } from './fen.ts'
import { loadPosition } from './load.ts'

function loaded(input: string) {
  const result = loadPosition(input)
  if (!result.ok) throw new Error(`expected a position, got error: ${result.error}`)
  return result.position
}

describe('loadPosition', () => {
  it('reads a full FEN into pieces and the side to move', () => {
    const position = loaded(START_FEN)
    expect(placementFromBoard(position.pieces)).toBe(START_FEN.split(' ')[0])
    expect(position.turn).toBe('w')
    expect(position.pieces.get('e1')).toEqual({ color: 'w', role: 'k' })
    expect(position.pieces.get('e8')).toEqual({ color: 'b', role: 'k' })
  })

  it('defaults to White when a FEN has only the placement field', () => {
    const position = loaded('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
    expect(position.pieces.size).toBe(32)
    expect(position.turn).toBe('w')
  })

  it('reads Black to move from a FEN', () => {
    const position = loaded('4k3/8/8/8/8/8/8/4K3 b - - 0 1')
    expect(position.turn).toBe('b')
    expect(position.pieces.size).toBe(2)
  })

  it('reads an empty board', () => {
    const position = loaded('8/8/8/8/8/8/8/8 w - - 0 1')
    expect(position.pieces.size).toBe(0)
  })

  it('rejects a FEN with the wrong number of ranks', () => {
    const result = loadPosition('rnbqkbnr/pppppppp/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('8 ranks')
  })

  it('rejects a FEN with an unknown piece letter', () => {
    const result = loadPosition('xnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('x')
  })

  it('rejects a FEN whose side to move is neither w nor b', () => {
    const result = loadPosition('4k3/8/8/8/8/8/8/4K3 x - - 0 1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('w or b')
  })

  it('plays a moves-only PGN to its final position', () => {
    const position = loaded('1. e4 e5 2. Nf3 Nc6')
    expect(position.turn).toBe('w')
    expect(position.pieces.get('f3')).toEqual({ color: 'w', role: 'n' })
    expect(position.pieces.get('c6')).toEqual({ color: 'b', role: 'n' })
    expect(position.pieces.get('g1')).toBeUndefined()
  })

  it('reads a PGN with headers', () => {
    const pgn = ['[Event "Test"]', '[White "A"]', '[Black "B"]', '', '1. d4 d5 2. c4 *'].join('\n')
    const position = loaded(pgn)
    expect(position.turn).toBe('b')
    expect(position.pieces.get('c4')).toEqual({ color: 'w', role: 'p' })
    expect(position.pieces.get('d4')).toEqual({ color: 'w', role: 'p' })
  })

  it('reports an error for text that is neither FEN nor PGN', () => {
    const result = loadPosition('just some words')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('FEN or PGN')
  })

  it('reports an error for empty input', () => {
    const result = loadPosition('   ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Enter a FEN or PGN')
  })

  it('reads the en passant square from a FEN', () => {
    expect(loaded('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1').enPassant).toBe('d6')
  })

  it('leaves en passant null when the FEN has none', () => {
    expect(loaded('4k3/8/8/8/8/8/8/4K3 b - - 0 1').enPassant).toBeNull()
  })

  it('drops a malformed en passant field', () => {
    expect(loaded('4k3/8/8/8/8/8/8/4K3 w - z9 0 1').enPassant).toBeNull()
  })

  it('reads the en passant square from a PGN double push', () => {
    expect(loaded('1. e4 d5 2. e5 f5').enPassant).toBe('f6')
  })
})
