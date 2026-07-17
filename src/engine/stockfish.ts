import type { Color } from '../chess/types.ts'
import {
  formatScore,
  parseBestMove,
  parseInfo,
  whiteCentipawns,
  whiteMate,
  type BestMove,
  type InfoLine,
  type Score,
} from './uci.ts'

export const ENGINE_URL = '/engine/stockfish-18-lite-single.js'

export type EngineState = 'loading' | 'ready' | 'thinking' | 'error'

export interface Evaluation {
  bestMove: string | null
  ponder: string | null
  depth: number
  score: Score
  whiteCp: number | null
  whiteMate: number | null
  text: string
  pv: string[]
}

export interface SearchProgress {
  depth: number
  whiteCp: number | null
  whiteMate: number | null
  text: string
}

export interface EvaluateOptions {
  depth?: number
  movetime?: number
  onInfo?: (progress: SearchProgress) => void
}

type LineListener = (line: string) => void

interface ActiveSearch {
  reject: (reason: Error) => void
  cleanup: () => void
}

const DEFAULT_DEPTH = 15

/** Wraps the Stockfish Web Worker and speaks UCI to it. One search runs at a
    time; a new evaluate() supersedes a running one so the newest position is
    what the engine works on. */
export class StockfishEngine {
  private readonly worker: Worker
  private readonly listeners = new Set<LineListener>()
  private readonly ready: Promise<void>
  private chain: Promise<unknown> = Promise.resolve()
  private activeSearch: ActiveSearch | null = null
  private searching = false
  private dead = false
  private state: EngineState = 'loading'

  constructor(url: string = ENGINE_URL) {
    this.worker = new Worker(url)
    this.worker.onmessage = (event: MessageEvent) => {
      for (const raw of String(event.data).split('\n')) {
        const line = raw.trim()
        if (!line) continue
        for (const listener of [...this.listeners]) listener(line)
      }
    }
    this.ready = new Promise((resolve, reject) => {
      this.worker.addEventListener('error', (event) => {
        this.dead = true
        this.state = 'error'
        const error = new Error(`Stockfish worker error (${event.message || url})`)
        reject(error)
        this.failActiveSearch(error)
      })
      void this.boot().then(resolve, reject)
    })
  }

  getState(): EngineState {
    return this.state
  }

  whenReady(): Promise<void> {
    return this.ready
  }

  /** Evaluates a FEN and resolves with the best move and score for that same
      position. A later evaluate() supersedes a running one, so a resolved
      Evaluation may be for an already-superseded position; the caller should
      key results to the FEN it requested. Rejects if the engine failed to load
      or was terminated during the search. */
  evaluate(fen: string, options: EvaluateOptions = {}): Promise<Evaluation> {
    if (this.searching) this.send('stop')
    const run = (): Promise<Evaluation> => this.runSearch(fen, options)
    const next = this.chain.then(() => this.ready).then(run)
    this.chain = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  terminate(): void {
    this.dead = true
    this.failActiveSearch(new Error('Engine terminated during search'))
    this.worker.terminate()
    this.listeners.clear()
  }

  private async boot(): Promise<void> {
    this.send('uci')
    await this.waitFor((line) => line === 'uciok')
    this.send('ucinewgame')
    this.send('isready')
    await this.waitFor((line) => line === 'readyok')
    this.state = 'ready'
  }

  private runSearch(fen: string, options: EvaluateOptions): Promise<Evaluation> {
    if (this.dead) return Promise.reject(new Error('Engine is not available'))

    const turn = (fen.split(' ')[1] as Color) ?? 'w'
    const limit =
      options.movetime !== undefined
        ? `movetime ${options.movetime}`
        : `depth ${options.depth ?? DEFAULT_DEPTH}`

    return new Promise<Evaluation>((resolve, reject) => {
      let latest: InfoLine | null = null
      const cleanup = (): void => {
        this.listeners.delete(listener)
        this.searching = false
        this.activeSearch = null
      }
      const listener: LineListener = (line) => {
        const info = parseInfo(line)
        if (info) {
          latest = info
          options.onInfo?.({
            depth: info.depth,
            whiteCp: whiteCentipawns(info.score, turn),
            whiteMate: whiteMate(info.score, turn),
            text: formatScore(info.score, turn),
          })
          return
        }
        const best = parseBestMove(line)
        if (!best) return
        cleanup()
        this.state = 'ready'
        resolve(buildEvaluation(latest, best, turn))
      }
      this.listeners.add(listener)
      this.searching = true
      this.state = 'thinking'
      this.activeSearch = { reject, cleanup }
      this.send(`position fen ${fen}`)
      this.send(`go ${limit}`)
    })
  }

  private failActiveSearch(reason: Error): void {
    const active = this.activeSearch
    if (!active) return
    active.cleanup()
    active.reject(reason)
  }

  private send(command: string): void {
    this.worker.postMessage(command)
  }

  private waitFor(match: (line: string) => boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      const listener: LineListener = (line) => {
        if (!match(line)) return
        this.listeners.delete(listener)
        resolve()
      }
      this.listeners.add(listener)
    })
  }
}

function buildEvaluation(info: InfoLine | null, best: BestMove, turn: Color): Evaluation {
  const score: Score = info?.score ?? { type: 'cp', value: 0 }
  return {
    bestMove: best.move,
    ponder: best.ponder,
    depth: info?.depth ?? 0,
    score,
    whiteCp: whiteCentipawns(score, turn),
    whiteMate: whiteMate(score, turn),
    text: formatScore(score, turn),
    pv: info?.pv ?? [],
  }
}
