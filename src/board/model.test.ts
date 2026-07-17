import { describe, expect, it, vi } from 'vitest'
import { START_FEN } from '../chess/fen.ts'
import { BoardModel } from './model.ts'

describe('BoardModel', () => {
  it('starts at the standard position with White to move', () => {
    const model = new BoardModel()
    expect(model.getPieces().size).toBe(32)
    expect(model.getTurn()).toBe('w')
    expect(model.fen()).toBe(START_FEN)
  })

  it('clears to an empty board without changing the turn', () => {
    const model = new BoardModel()
    model.setTurn('b')
    model.clear()
    expect(model.getPieces().size).toBe(0)
    expect(model.getTurn()).toBe('b')
  })

  it('resets to the starting position with White to move', () => {
    const model = new BoardModel()
    model.clear()
    model.setTurn('b')
    model.reset()
    expect(model.getPieces().size).toBe(32)
    expect(model.getTurn()).toBe('w')
    expect(model.fen()).toBe(START_FEN)
  })

  it('puts and removes pieces', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e4', { color: 'w', role: 'q' })
    expect(model.get('e4')).toEqual({ color: 'w', role: 'q' })
    model.remove('e4')
    expect(model.get('e4')).toBeUndefined()
  })

  it('moves a piece, overwriting the target and clearing the source', () => {
    const model = new BoardModel()
    model.clear()
    model.put('a1', { color: 'w', role: 'r' })
    model.put('a8', { color: 'b', role: 'r' })
    model.move('a1', 'a8')
    expect(model.get('a1')).toBeUndefined()
    expect(model.get('a8')).toEqual({ color: 'w', role: 'r' })
  })

  it('flips the side to move after each move, regardless of colour', () => {
    const model = new BoardModel()
    expect(model.getTurn()).toBe('w')
    model.move('e2', 'e4')
    expect(model.getTurn()).toBe('b')
    model.move('e7', 'e5')
    expect(model.getTurn()).toBe('w')
    model.move('g1', 'f3')
    expect(model.getTurn()).toBe('b')
  })

  it('does not flip the turn when placing or removing a piece', () => {
    const model = new BoardModel()
    expect(model.getTurn()).toBe('w')
    model.put('e4', { color: 'b', role: 'q' })
    expect(model.getTurn()).toBe('w')
    model.remove('e4')
    expect(model.getTurn()).toBe('w')
    model.clear()
    expect(model.getTurn()).toBe('w')
  })

  it('alternates from a manually overridden turn', () => {
    const model = new BoardModel()
    model.setTurn('b')
    model.move('e2', 'e4')
    expect(model.getTurn()).toBe('w')
  })

  it('does not flip or notify when a piece is dropped on its own square', () => {
    const model = new BoardModel()
    const listener = vi.fn()
    model.subscribe(listener)
    model.move('a2', 'a2')
    expect(model.getTurn()).toBe('w')
    expect(model.get('a2')).toEqual({ color: 'w', role: 'p' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const model = new BoardModel()
    const listener = vi.fn()
    const unsubscribe = model.subscribe(listener)
    model.setTurn('b')
    model.put('e4', { color: 'w', role: 'p' })
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    model.clear()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not notify on a no-op move or a redundant turn set', () => {
    const model = new BoardModel()
    const listener = vi.fn()
    model.subscribe(listener)
    model.setTurn('w')
    model.move('e4', 'e5')
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not notify when putting an identical piece on a square', () => {
    const model = new BoardModel()
    const listener = vi.fn()
    model.subscribe(listener)
    model.put('e1', { color: 'w', role: 'k' })
    expect(listener).not.toHaveBeenCalled()
    model.put('e1', { color: 'b', role: 'k' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('has nothing to undo until an edit happens', () => {
    const model = new BoardModel()
    expect(model.canUndo()).toBe(false)
    model.move('e2', 'e4')
    expect(model.canUndo()).toBe(true)
  })

  it('undoes a move, restoring the pieces and the turn', () => {
    const model = new BoardModel()
    model.move('e2', 'e4')
    expect(model.getTurn()).toBe('b')
    model.undo()
    expect(model.get('e2')).toEqual({ color: 'w', role: 'p' })
    expect(model.get('e4')).toBeUndefined()
    expect(model.getTurn()).toBe('w')
    expect(model.canUndo()).toBe(false)
  })

  it('undoes a spawned and a removed piece', () => {
    const model = new BoardModel()
    model.clear()
    model.put('d4', { color: 'w', role: 'n' })
    model.undo()
    expect(model.get('d4')).toBeUndefined()

    model.remove('a1')
    expect(model.get('a1')).toBeUndefined()
    model.undo()
    expect(model.get('a1')).toEqual({ color: 'w', role: 'r' })
  })

  it('undoes clear, reset, and setPosition', () => {
    const model = new BoardModel()
    model.clear()
    model.undo()
    expect(model.getPieces().size).toBe(32)

    model.setTurn('b')
    model.reset()
    expect(model.getTurn()).toBe('w')
    model.undo()
    expect(model.getTurn()).toBe('b')

    model.setPosition(new Map([['h4', { color: 'b', role: 'q' }]]), 'b')
    expect(model.getPieces().size).toBe(1)
    model.undo()
    expect(model.getPieces().size).toBe(32)
  })

  it('steps back through several edits in order', () => {
    const model = new BoardModel()
    model.clear()
    model.put('a1', { color: 'w', role: 'r' })
    model.put('h8', { color: 'b', role: 'r' })
    model.undo()
    expect(model.get('h8')).toBeUndefined()
    expect(model.get('a1')).toEqual({ color: 'w', role: 'r' })
    model.undo()
    expect(model.get('a1')).toBeUndefined()
    expect(model.getPieces().size).toBe(0)
    model.undo()
    expect(model.getPieces().size).toBe(32)
    expect(model.canUndo()).toBe(false)
  })

  it('does not record the turn toggle as its own undo step', () => {
    const model = new BoardModel()
    model.setTurn('b')
    expect(model.canUndo()).toBe(false)
    model.undo()
    expect(model.getTurn()).toBe('b')
  })

  it('does not record a reset that is already at the start position', () => {
    const model = new BoardModel()
    const listener = vi.fn()
    model.subscribe(listener)
    model.reset()
    expect(model.canUndo()).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('does nothing and does not notify when there is nothing to undo', () => {
    const model = new BoardModel()
    const listener = vi.fn()
    model.subscribe(listener)
    model.undo()
    expect(listener).not.toHaveBeenCalled()
    expect(model.getPieces().size).toBe(32)
  })

  it('promotes on move and restores the pawn on undo', () => {
    const model = new BoardModel()
    model.clear()
    model.put('a7', { color: 'w', role: 'p' })
    model.move('a7', 'a8', 'q')
    expect(model.get('a8')).toEqual({ color: 'w', role: 'q' })
    expect(model.get('a7')).toBeUndefined()
    model.undo()
    expect(model.get('a7')).toEqual({ color: 'w', role: 'p' })
    expect(model.get('a8')).toBeUndefined()
  })

  it('castles kingside, hopping the h-rook to f1 and flipping the turn', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('h1', { color: 'w', role: 'r' })
    model.move('e1', 'g1')
    expect(model.get('g1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('f1')).toEqual({ color: 'w', role: 'r' })
    expect(model.get('e1')).toBeUndefined()
    expect(model.get('h1')).toBeUndefined()
    expect(model.getTurn()).toBe('b')
  })

  it('castles queenside, hopping the a-rook to d1', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('a1', { color: 'w', role: 'r' })
    model.move('e1', 'c1')
    expect(model.get('c1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('d1')).toEqual({ color: 'w', role: 'r' })
    expect(model.get('e1')).toBeUndefined()
    expect(model.get('a1')).toBeUndefined()
  })

  it('castles Black on the eighth rank, leaving the far rook in place', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e8', { color: 'b', role: 'k' })
    model.put('h8', { color: 'b', role: 'r' })
    model.put('a8', { color: 'b', role: 'r' })
    model.setTurn('b')
    model.move('e8', 'g8')
    expect(model.get('g8')).toEqual({ color: 'b', role: 'k' })
    expect(model.get('f8')).toEqual({ color: 'b', role: 'r' })
    expect(model.get('a8')).toEqual({ color: 'b', role: 'r' })
    expect(model.getTurn()).toBe('w')
  })

  it('does not castle when a piece blocks the path, moving only the king', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('h1', { color: 'w', role: 'r' })
    model.put('f1', { color: 'w', role: 'b' })
    model.move('e1', 'g1')
    expect(model.get('g1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('f1')).toEqual({ color: 'w', role: 'b' })
    expect(model.get('h1')).toEqual({ color: 'w', role: 'r' })
  })

  it('does not castle without a rook on the corner', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.move('e1', 'g1')
    expect(model.get('g1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('f1')).toBeUndefined()
  })

  it('does not castle with an enemy rook on the corner', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('h1', { color: 'b', role: 'r' })
    model.move('e1', 'g1')
    expect(model.get('g1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('h1')).toEqual({ color: 'b', role: 'r' })
    expect(model.get('f1')).toBeUndefined()
  })

  it('does not castle queenside when b1 is occupied, though the king does not cross it', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('a1', { color: 'w', role: 'r' })
    model.put('b1', { color: 'w', role: 'n' })
    model.move('e1', 'c1')
    expect(model.get('c1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('a1')).toEqual({ color: 'w', role: 'r' })
    expect(model.get('b1')).toEqual({ color: 'w', role: 'n' })
    expect(model.get('d1')).toBeUndefined()
  })

  it('undoes a castle in one step, restoring king and rook', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('h1', { color: 'w', role: 'r' })
    model.move('e1', 'g1')
    model.undo()
    expect(model.get('e1')).toEqual({ color: 'w', role: 'k' })
    expect(model.get('h1')).toEqual({ color: 'w', role: 'r' })
    expect(model.get('g1')).toBeUndefined()
    expect(model.get('f1')).toBeUndefined()
    expect(model.getTurn()).toBe('w')
  })

  it('reports a castle as a quiet move, not a capture', () => {
    const model = new BoardModel()
    model.clear()
    model.put('e1', { color: 'w', role: 'k' })
    model.put('h1', { color: 'w', role: 'r' })
    const listener = vi.fn()
    model.subscribe(listener)
    model.move('e1', 'g1')
    expect(listener).toHaveBeenCalledWith({ kind: 'move', capture: false })
  })
})
