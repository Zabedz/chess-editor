import { BoardModel } from './board/model.ts'
import { BoardView } from './board/view.ts'
import { DragController } from './board/dnd.ts'
import { Palette } from './board/palette.ts'
import type { Orientation } from './board/types.ts'
import { classifyPosition } from './chess/status.ts'
import { pathBetween } from './chess/geometry.ts'
import { sanForMove } from './chess/notation.ts'
import type { Color, Role, Square } from './chess/types.ts'
import { StockfishEngine } from './engine/stockfish.ts'
import { Sounds } from './audio/sounds.ts'
import { SettingsStore, normalizeKey, type Settings } from './settings/settings.ts'
import { EvalPanel } from './ui/evalPanel.ts'
import { SettingsPanel } from './ui/settingsPanel.ts'
import { applyVisuals } from './ui/visuals.ts'
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
  private readonly settings: SettingsStore
  private readonly sounds: Sounds
  private readonly settingsPanel: SettingsPanel
  private readonly back: HTMLButtonElement
  private readonly forward: HTMLButtonElement
  private orientation: Orientation = 'white'

  // Last depth handed to the engine, so a settings change re-searches only when
  // the depth actually moved.
  private depth: number

  // The engine's current best move, or null when there is none to play. Back
  // undoes the last edit; Forward plays this move.
  private bestMove: { from: Square; to: Square; promotion?: Role } | null = null

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

    this.settings = new SettingsStore()
    const initial = this.settings.get()
    this.depth = initial.depth
    this.sounds = new Sounds(initial)
    applyVisuals(initial)

    const drag = new DragController(this.model, refs.board)
    drag.attach()
    this.palette = new Palette(refs.palette, drag)
    wireControls(refs, this.model)
    wireTheme(refs.themeButton)

    this.settingsPanel = new SettingsPanel(this.settings)
    refs.settingsButton.addEventListener('click', () => this.settingsPanel.open())
    this.settings.subscribe((settings) => this.applySettings(settings))

    this.back = refs.backButton
    this.forward = refs.forwardButton
    this.back.addEventListener('click', () => this.model.undo())
    this.forward.addEventListener('click', () => this.playBest())
    refs.flipButton.addEventListener('click', () => this.flip())
    window.addEventListener('keydown', (event) => this.onKey(event))

    this.panel.render({ kind: 'loading' })
    this.syncNav()
    this.model.subscribe((change) => {
      if (change.kind === 'move') {
        if (change.capture) this.sounds.capture()
        else this.sounds.move()
      }
    })
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

  private onKey(event: KeyboardEvent): void {
    // Inert while the settings dialog captures keys, and bare keys only, so
    // rebinding, browser, and text-field shortcuts keep working.
    if (this.settingsPanel.isOpen()) return
    if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return

    const keys = this.settings.get().keys
    const key = normalizeKey(event.key)
    if (key === keys.flip) {
      event.preventDefault()
      this.flip()
    } else if (key === keys.back && this.model.canUndo()) {
      event.preventDefault()
      this.model.undo()
    } else if (key === keys.forward && this.bestMove) {
      event.preventDefault()
      this.playBest()
    } else if (key === keys.reset) {
      event.preventDefault()
      this.model.reset()
    }
  }

  private applySettings(settings: Settings): void {
    this.sounds.update(settings)
    applyVisuals(settings)
    if (settings.depth !== this.depth) {
      this.depth = settings.depth
      this.recompute()
    }
  }

  /** Plays the engine's suggested move, which flips the turn and re-runs the
      search on the new position. */
  private playBest(): void {
    if (!this.bestMove) return
    const { from, to, promotion } = this.bestMove
    this.model.move(from, to, promotion)
  }

  /** The single place bestMove changes, so the Back/Forward enabled state stays
      in step with it. */
  private setBestMove(value: { from: Square; to: Square; promotion?: Role } | null): void {
    this.bestMove = value
    this.syncNav()
  }

  private syncNav(): void {
    this.back.disabled = !this.model.canUndo()
    this.forward.disabled = this.bestMove === null
  }

  private recompute(): void {
    this.token++
    clearTimeout(this.timer)
    this.engine.stop()
    this.view.clearHighlight()
    this.setBestMove(null)

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
        depth: this.settings.get().depth,
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
          const promotion =
            evaluation.bestMove.length > 4 ? (evaluation.bestMove[4] as Role) : undefined
          this.setBestMove({ from, to, promotion })
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
