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
})
