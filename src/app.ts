import { BoardModel } from './board/model.ts'
import { BoardView } from './board/view.ts'
import { DragController } from './board/dnd.ts'
import { mountPalette } from './board/palette.ts'
import { classifyPosition } from './chess/status.ts'
import { sanForMove } from './chess/notation.ts'
import type { Color, Square } from './chess/types.ts'
import { StockfishEngine } from './engine/stockfish.ts'
import { EvalPanel } from './ui/evalPanel.ts'
import { wireControls } from './ui/controls.ts'
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
  private readonly panel: EvalPanel
  private readonly engine: StockfishEngine

  // Bumped on every position or turn change; a search whose token is stale by
  // the time it resolves is discarded, so a superseded result never lands.
  private token = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private engineReady = false
  private engineFailed = false

  constructor(refs: ShellRefs) {
    this.model = new BoardModel()
    this.view = new BoardView(refs.board, this.model)
    this.panel = new EvalPanel(refs.evalPanel)
    this.engine = new StockfishEngine()

    const drag = new DragController(this.model, refs.board)
    drag.attach()
    mountPalette(refs.palette, drag)
    wireControls(refs, this.model)

    this.panel.render({ kind: 'loading' })
    this.model.subscribe(() => this.recompute())

    this.engine.whenReady().then(
      () => {
        this.engineReady = true
        this.recompute()
      },
      () => {
        this.engineFailed = true
        this.recompute()
      },
    )
  }

  private recompute(): void {
    this.token++
    clearTimeout(this.timer)
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
        if (this.engineFailed) {
          this.panel.render({ kind: 'error' })
          return
        }
        if (!this.engineReady) {
          this.panel.render({ kind: 'loading' })
          return
        }
        // Show a searching state now so the panel matches the just-cleared
        // highlight instead of lingering on the previous position's numbers.
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
          this.view.setHighlight({
            from: evaluation.bestMove.slice(0, 2) as Square,
            to: evaluation.bestMove.slice(2, 4) as Square,
          })
        }
      })
      .catch(() => {
        if (token === this.token) this.panel.render({ kind: 'error' })
      })
  }
}
