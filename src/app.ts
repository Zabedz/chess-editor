import { BoardModel } from './board/model.ts'
import { BoardView } from './board/view.ts'
import { DragController } from './board/dnd.ts'
import { Palette } from './board/palette.ts'
import type { Orientation } from './board/types.ts'
import { classifyPosition } from './chess/status.ts'
import { pathBetween } from './chess/geometry.ts'
import { sanForMove } from './chess/notation.ts'
import type { Color, Square } from './chess/types.ts'
import { StockfishEngine } from './engine/stockfish.ts'
import { EvalPanel } from './ui/evalPanel.ts'
import { wireControls } from './ui/controls.ts'
import { wireTheme } from './ui/theme.ts'
import type { ShellRefs } from './ui/shell.ts'

// Wait this long after the last edit before asking the engine, so a burst of
// edits collapses into a single search.
const DEBOUNCE_MS = 200

/** Wires the board, palette, controls, engine, and panel together, and keeps
    the evaluation and the highlighted best-move squares in step with the
    edited position and the side to move. */
export class App {
  private readonly model: BoardModel
  private readonly view: BoardView
  private readonly palette: Palette
  private readonly panel: EvalPanel
  private readonly engine: StockfishEngine
  private orientation: Orientation = 'white'

  // Bumped on every position or turn change; a search whose token is stale by
  // the time it resolves is discarded, so a superseded result never lands.
  private token = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private engineReady = false

  constructor(refs: ShellRefs) {
    this.model = new BoardModel()
    this.view = new BoardView(refs.board, this.model)
    this.panel = new EvalPanel(refs.evalPanel)
    this.engine = new StockfishEngine()

    const drag = new DragController(this.model, refs.board)
    drag.attach()
    this.palette = new Palette(refs.palette, drag)
    wireControls(refs, this.model)
    wireTheme(refs.themeButton)

    refs.flipButton.addEventListener('click', () => this.flip())
    window.addEventListener('keydown', (event) => {
      // Bare f only. Let Cmd/Ctrl/Alt+F reach the browser (find, and the rest).
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key.toLowerCase() === 'f' && !isTyping(event.target)) this.flip()
    })

    this.panel.render({ kind: 'loading' })
    this.model.subscribe(() => this.recompute())

    this.engine.whenReady().then(
      () => {
        this.engineReady = true
        this.recompute()
      },
      () => {
        // Boot failed; the engine is now marked dead, so recompute renders the
        // error state for a legal position.
        this.recompute()
      },
    )
  }

  /** Flips the board and the palette. Orientation is view-only; it does not
      touch the position or the FEN. */
  private flip(): void {
    this.orientation = this.orientation === 'white' ? 'black' : 'white'
    this.view.setOrientation(this.orientation)
    this.palette.setOrientation(this.orientation)
  }

  private recompute(): void {
    this.token++
    clearTimeout(this.timer)
    this.engine.stop()
    this.view.clearHighlight()

    const turn = this.model.getTurn()
    const status = classifyPosition(this.model.getPieces(), turn)

    switch (status.kind) {
      case 'empty':
        this.panel.setFen(null)
        this.panel.render({ kind: 'empty' })
        return
      case 'illegal':
        this.panel.setFen(this.model.fen())
        this.panel.render({ kind: 'illegal', reason: status.reason, turn })
        return
      case 'checkmate':
        this.panel.setFen(this.model.fen())
        this.panel.render({ kind: 'checkmate', winner: status.winner, turn })
        return
      case 'stalemate':
        this.panel.setFen(this.model.fen())
        this.panel.render({ kind: 'stalemate', turn })
        return
      case 'legal':
        this.panel.setFen(status.fen)
        if (!this.engine.isAlive()) {
          this.panel.render({ kind: 'error' })
          return
        }
        if (!this.engineReady) {
          this.panel.render({ kind: 'loading' })
          return
        }
        // Show a searching state now so the panel tracks the just-cleared
        // highlight while the next search runs.
        this.panel.render({ kind: 'searching', turn })
        this.timer = setTimeout(() => this.search(status.fen, turn, this.token), DEBOUNCE_MS)
        return
    }
  }

  private search(fen: string, turn: Color, token: number): void {
    if (token !== this.token) return
    this.engine
      .evaluate(fen, {
        onInfo: (progress) => {
          if (token === this.token) this.panel.render({ kind: 'thinking', turn, progress })
        },
      })
      .then((evaluation) => {
        if (token !== this.token) return
        const san = evaluation.bestMove ? sanForMove(fen, evaluation.bestMove) : null
        this.panel.render({ kind: 'ready', turn, evaluation, san })
        if (evaluation.bestMove) {
          const from = evaluation.bestMove.slice(0, 2) as Square
          const to = evaluation.bestMove.slice(2, 4) as Square
          this.view.setHighlight({ from, to, path: pathBetween(from, to) })
        }
      })
      .catch(() => {
        // A rejected search means the worker died; recompute reads the engine's
        // liveness and renders the error state.
        this.recompute()
      })
  }
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}
