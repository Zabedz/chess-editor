import type { Color } from '../chess/types.ts'
import type { Evaluation, SearchProgress } from '../engine/stockfish.ts'
import './evalPanel.css'

export type PanelState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'searching'; turn: Color }
  | { kind: 'illegal'; reason: string; turn: Color }
  | { kind: 'checkmate'; winner: Color; turn: Color }
  | { kind: 'stalemate'; turn: Color }
  | { kind: 'thinking'; turn: Color; progress: SearchProgress }
  | { kind: 'ready'; turn: Color; evaluation: Evaluation; san: string | null }

// Below this many centipawns the position reads as balanced, so the score
// keeps a neutral colour and the subtext says "Equal".
const EQUAL_CP = 30

// How long the copy button reads "Copied" after a successful copy.
const COPIED_LABEL_MS = 1200

/** Renders the evaluation panel. The orchestrator maps the position and engine
    state to a PanelState and calls render(); the panel also owns one action,
    copying the FEN it displays. */
export class EvalPanel {
  private readonly el: Record<string, HTMLElement>
  private copyTimer: ReturnType<typeof setTimeout> | undefined

  constructor(root: HTMLElement) {
    root.classList.add('eval-panel')
    root.innerHTML = `
      <div class="eval-head">
        <h2 class="panel-title" id="eval-heading">Evaluation</h2>
        <span class="stm" data-el="stm"></span>
      </div>
      <div class="eval-detail" data-el="detail">
        <div class="evalbar" aria-hidden="true"><div class="evalbar-white" data-el="bar"></div><div class="evalbar-mid"></div></div>
        <p class="score" data-el="score"></p>
        <p class="score-sub" data-el="sub"></p>
        <div class="kv">
          <div class="row">
            <span class="k">Best move</span>
            <span class="move">
              <span class="move-san" data-el="moveSan"></span>
              <span class="move-uci" data-el="moveUci"></span>
            </span>
          </div>
          <div class="row"><span class="k">Depth</span><span class="v" data-el="depth"></span></div>
        </div>
      </div>
      <p class="eval-message" data-el="message" aria-live="polite"></p>
      <div class="eval-status" data-el="status" role="status" aria-live="polite">
        <span class="led" data-el="led"></span><span data-el="statusText"></span>
      </div>
      <div class="fen" data-el="fenRow" hidden>
        <div class="fen-head">
          <span class="fen-label">FEN</span>
          <button type="button" class="fen-copy" data-el="fenCopy">Copy</button>
        </div>
        <span class="fen-text" data-el="fen"></span>
      </div>
    `
    this.el = {}
    for (const node of root.querySelectorAll<HTMLElement>('[data-el]')) {
      this.el[node.dataset.el as string] = node
    }
    this.el.fenCopy.addEventListener('click', () => this.copyFen())
  }

  render(state: PanelState): void {
    const turn = 'turn' in state ? state.turn : null
    this.el.stm.textContent = turn ? sideLabel(turn) : ''
    this.el.stm.hidden = turn === null

    switch (state.kind) {
      case 'loading':
        this.showMessage('Loading the engine.')
        this.setStatus('loading', 'Loading engine')
        break
      case 'error':
        this.showMessage('The engine could not be loaded.')
        this.setStatus('error', 'Engine unavailable')
        break
      case 'empty':
        this.showMessage("Place pieces to see the engine's best move.")
        this.setStatus('idle', 'Waiting for a position')
        break
      case 'searching':
        this.showMessage('Searching for the best move.')
        this.setStatus('thinking', 'Searching')
        break
      case 'illegal':
        this.showMessage(state.reason)
        this.setStatus('illegal', 'Illegal position')
        break
      case 'checkmate':
        this.showMessage(`Checkmate. ${sideName(state.winner)} wins.`)
        this.setStatus('terminal', 'Game over')
        break
      case 'stalemate':
        this.showMessage('Stalemate. The game is drawn.')
        this.setStatus('terminal', 'Game over')
        break
      case 'thinking': {
        const p = state.progress
        this.showDetail(p.whiteCp, p.whiteMate, p.text, p.depth, 'Searching', '')
        this.setStatus('thinking', `Thinking at depth ${p.depth}`)
        break
      }
      case 'ready': {
        const ev = state.evaluation
        const primary = state.san ?? ev.bestMove ?? 'No move'
        const secondary = state.san && ev.bestMove ? ev.bestMove : ''
        this.showDetail(ev.whiteCp, ev.whiteMate, ev.text, ev.depth, primary, secondary)
        this.setStatus('ready', `Depth ${ev.depth}`)
        break
      }
      default: {
        const unreachable: never = state
        return unreachable
      }
    }
  }

  setFen(fen: string | null): void {
    this.el.fenRow.hidden = fen === null
    if (fen) this.el.fen.textContent = fen
  }

  private copyFen(): void {
    const fen = this.el.fen.textContent
    if (!fen || !navigator.clipboard) return
    // The write can be denied by clipboard permissions; the FEN stays on screen
    // to copy by hand, so a rejection needs no separate error path.
    navigator.clipboard.writeText(fen).then(() => this.flashCopied(), () => undefined)
  }

  private flashCopied(): void {
    clearTimeout(this.copyTimer)
    this.el.fenCopy.textContent = 'Copied'
    this.copyTimer = setTimeout(() => {
      this.el.fenCopy.textContent = 'Copy'
    }, COPIED_LABEL_MS)
  }

  private showMessage(text: string): void {
    this.el.detail.hidden = true
    this.el.message.hidden = false
    this.el.message.textContent = text
  }

  private showDetail(
    whiteCp: number | null,
    whiteMate: number | null,
    text: string,
    depth: number,
    moveSan: string,
    moveUci: string,
  ): void {
    this.el.message.hidden = true
    this.el.detail.hidden = false
    this.el.bar.style.width = `${barFill(whiteCp, whiteMate)}%`
    this.el.score.textContent = text
    this.el.score.className = `score ${scoreTone(whiteCp, whiteMate)}`
    this.el.sub.textContent = describeAdvantage(whiteCp, whiteMate)
    this.el.moveSan.textContent = moveSan
    this.el.moveUci.textContent = moveUci
    this.el.depth.textContent = String(depth)
  }

  private setStatus(tone: string, text: string): void {
    this.el.status.dataset.tone = tone
    this.el.statusText.textContent = text
  }
}

function sideLabel(turn: Color): string {
  return turn === 'w' ? 'White to move' : 'Black to move'
}

function sideName(color: Color): string {
  return color === 'w' ? 'White' : 'Black'
}

function scoreTone(whiteCp: number | null, whiteMate: number | null): string {
  if (whiteMate !== null) return 'mate'
  if (whiteCp === null) return ''
  if (whiteCp >= EQUAL_CP) return 'pos'
  if (whiteCp <= -EQUAL_CP) return 'neg'
  return ''
}

function barFill(whiteCp: number | null, whiteMate: number | null): number {
  if (whiteMate !== null) return whiteMate > 0 ? 100 : whiteMate < 0 ? 0 : 50
  if (whiteCp === null) return 50
  const percent = 50 + 50 * Math.tanh(whiteCp / 400)
  return Math.max(3, Math.min(97, percent))
}

function describeAdvantage(whiteCp: number | null, whiteMate: number | null): string {
  if (whiteMate !== null) {
    if (whiteMate === 0) return ''
    return whiteMate > 0 ? 'White has a forced mate' : 'Black has a forced mate'
  }
  if (whiteCp === null) return ''
  const advantage = Math.abs(whiteCp)
  const side = whiteCp > 0 ? 'White' : 'Black'
  if (advantage < EQUAL_CP) return 'Equal'
  if (advantage < 90) return `${side} is slightly better`
  if (advantage < 250) return `${side} is better`
  if (advantage < 600) return `${side} is much better`
  return `${side} is winning`
}
