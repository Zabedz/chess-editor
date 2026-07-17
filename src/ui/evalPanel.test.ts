// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { Evaluation } from '../engine/stockfish.ts'
import { EvalPanel } from './evalPanel.ts'

const readyEval: Evaluation = {
  bestMove: 'g1f3',
  ponder: null,
  depth: 18,
  score: { type: 'cp', value: 34 },
  whiteCp: 34,
  whiteMate: null,
  text: '+0.34',
  pv: ['g1f3'],
}

function mount(): { root: HTMLElement; panel: EvalPanel } {
  const root = document.createElement('div')
  document.body.append(root)
  return { root, panel: new EvalPanel(root) }
}

function el(root: HTMLElement, key: string): HTMLElement {
  const node = root.querySelector<HTMLElement>(`[data-el="${key}"]`)
  if (!node) throw new Error(`missing [data-el="${key}"]`)
  return node
}

function tone(root: HTMLElement): string {
  return el(root, 'status').dataset.tone ?? ''
}

describe('EvalPanel', () => {
  it('shows a message and hides the detail while loading', () => {
    const { root, panel } = mount()
    panel.render({ kind: 'loading' })
    expect(el(root, 'detail').hidden).toBe(true)
    expect(el(root, 'message').hidden).toBe(false)
    expect(el(root, 'message').textContent).toContain('Loading')
  })

  it('renders a ready evaluation with the detail and the best move', () => {
    const { root, panel } = mount()
    panel.render({ kind: 'ready', turn: 'w', evaluation: readyEval, san: 'Nf3' })
    expect(el(root, 'detail').hidden).toBe(false)
    expect(el(root, 'message').hidden).toBe(true)
    expect(el(root, 'score').textContent).toBe('+0.34')
    expect(el(root, 'moveSan').textContent).toBe('Nf3')
    expect(el(root, 'moveUci').textContent).toBe('g1f3')
    expect(el(root, 'depth').textContent).toBe('18')
    expect(el(root, 'stm').textContent).toBe('White to move')
    expect(tone(root)).toBe('ready')
  })

  it('replaces the stale detail with a searching state on the new side', () => {
    const { root, panel } = mount()
    panel.render({ kind: 'ready', turn: 'w', evaluation: readyEval, san: 'Nf3' })
    panel.render({ kind: 'searching', turn: 'b' })
    expect(el(root, 'detail').hidden).toBe(true)
    expect(el(root, 'message').hidden).toBe(false)
    expect(el(root, 'message').textContent).toContain('Searching')
    expect(el(root, 'stm').textContent).toBe('Black to move')
    expect(tone(root)).toBe('thinking')
  })

  it('shows the illegal reason and hides the detail', () => {
    const { root, panel } = mount()
    panel.render({ kind: 'illegal', reason: 'Black has no king.', turn: 'w' })
    expect(el(root, 'message').textContent).toBe('Black has no king.')
    expect(el(root, 'detail').hidden).toBe(true)
    expect(tone(root)).toBe('illegal')
  })

  it('names the winner on checkmate', () => {
    const { root, panel } = mount()
    panel.render({ kind: 'checkmate', winner: 'w', turn: 'b' })
    expect(el(root, 'message').textContent).toContain('White wins')
    expect(el(root, 'detail').hidden).toBe(true)
    expect(tone(root)).toBe('terminal')
  })

  it('reports a draw on stalemate', () => {
    const { root, panel } = mount()
    panel.render({ kind: 'stalemate', turn: 'b' })
    expect(el(root, 'message').textContent).toContain('drawn')
    expect(tone(root)).toBe('terminal')
  })

  it('toggles the FEN row with setFen', () => {
    const { root, panel } = mount()
    panel.setFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
    expect(el(root, 'fenRow').hidden).toBe(false)
    expect(el(root, 'fen').textContent).toContain('4k3')
    panel.setFen(null)
    expect(el(root, 'fenRow').hidden).toBe(true)
  })
})
