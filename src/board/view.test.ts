// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { BoardModel } from './model.ts'
import { BoardView } from './view.ts'

function mount(): { root: HTMLElement; model: BoardModel; view: BoardView } {
  const root = document.createElement('div')
  document.body.append(root)
  const model = new BoardModel()
  const view = new BoardView(root, model)
  return { root, model, view }
}

function classes(root: HTMLElement, square: string): DOMTokenList | undefined {
  return root.querySelector<HTMLElement>(`[data-square="${square}"]`)?.classList
}

describe('BoardView', () => {
  it('builds 64 squares keyed by data-square', () => {
    const { root } = mount()
    expect(root.querySelectorAll('.square').length).toBe(64)
    expect(root.querySelector('[data-square="e1"]')).not.toBeNull()
    expect(root.querySelector('[data-square="h8"]')).not.toBeNull()
  })

  it('renders the starting pieces as labelled images', () => {
    const { root } = mount()
    expect(root.querySelectorAll('.square img.piece').length).toBe(32)
    expect(root.querySelector('[data-square="e1"] img.piece')?.getAttribute('alt')).toBe('white king')
  })

  it('applies from, to, and path classes to the right squares', () => {
    const { root, view } = mount()
    view.setHighlight({ from: 'e1', to: 'e5', path: ['e2', 'e3', 'e4'] })
    expect(classes(root, 'e1')?.contains('hl-from')).toBe(true)
    expect(classes(root, 'e5')?.contains('hl-to')).toBe(true)
    for (const square of ['e2', 'e3', 'e4']) {
      expect(classes(root, square)?.contains('hl-path')).toBe(true)
    }
    expect(root.querySelectorAll('.hl-from').length).toBe(1)
    expect(root.querySelectorAll('.hl-to').length).toBe(1)
    expect(root.querySelectorAll('.hl-path').length).toBe(3)
  })

  it('clears every highlight class', () => {
    const { root, view } = mount()
    view.setHighlight({ from: 'e1', to: 'e5', path: ['e2', 'e3', 'e4'] })
    view.clearHighlight()
    expect(root.querySelectorAll('.hl-from, .hl-to, .hl-path').length).toBe(0)
  })

  it('keeps the highlight when a model change re-renders pieces', () => {
    const { root, model, view } = mount()
    view.setHighlight({ from: 'e2', to: 'e4', path: ['e3'] })
    model.move('a2', 'a4')
    expect(classes(root, 'e2')?.contains('hl-from')).toBe(true)
    expect(classes(root, 'e3')?.contains('hl-path')).toBe(true)
    expect(classes(root, 'e4')?.contains('hl-to')).toBe(true)
  })
})
