import type { Color } from '../chess/types.ts'

export type ScoreType = 'cp' | 'mate'

export interface Score {
  type: ScoreType
  value: number // from the side-to-move's point of view
}

export interface InfoLine {
  depth: number
  score: Score
  pv: string[]
}

export interface BestMove {
  move: string | null // UCI move, or null for "bestmove (none)"
  ponder: string | null
}

function intField(line: string, pattern: RegExp): number | null {
  const match = pattern.exec(line)
  return match ? Number.parseInt(match[1], 10) : null
}

/** Parses a UCI `info` line that carries a principal variation and a score.
    Returns null for info lines without a usable pv (for example, currmove
    updates) or with only a lowerbound/upperbound score. */
export function parseInfo(line: string): InfoLine | null {
  if (!line.startsWith('info ') || !line.includes(' pv ')) return null
  if (line.includes(' lowerbound') || line.includes(' upperbound')) return null

  const depth = intField(line, /\bdepth (\d+)/)
  const cp = intField(line, /\bscore cp (-?\d+)/)
  const mate = intField(line, /\bscore mate (-?\d+)/)
  if (depth === null || (cp === null && mate === null)) return null

  const pv = line.split(' pv ')[1].trim().split(/\s+/)
  const score: Score = mate !== null ? { type: 'mate', value: mate } : { type: 'cp', value: cp as number }
  return { depth, score, pv }
}

/** Parses a UCI `bestmove` line. move is null for "bestmove (none)". */
export function parseBestMove(line: string): BestMove | null {
  const match = /^bestmove (\S+)(?: ponder (\S+))?/.exec(line)
  if (!match) return null
  return { move: match[1] === '(none)' ? null : match[1], ponder: match[2] ?? null }
}

/** Centipawn score from White's point of view, or null for a mate score. */
export function whiteCentipawns(score: Score, turn: Color): number | null {
  if (score.type !== 'cp') return null
  return turn === 'w' ? score.value : -score.value
}

/** Signed distance to mate from White's point of view, or null for a cp score.
    Positive means White delivers mate; negative means White is mated. */
export function whiteMate(score: Score, turn: Color): number | null {
  if (score.type !== 'mate') return null
  return turn === 'w' ? score.value : -score.value
}

/** A human score from White's point of view: "+1.24", "-0.80", "0.00", "#3",
    or "#-2". */
export function formatScore(score: Score, turn: Color): string {
  if (score.type === 'mate') {
    const mate = whiteMate(score, turn) as number
    return mate >= 0 ? `#${mate}` : `#-${Math.abs(mate)}`
  }
  const pawns = (whiteCentipawns(score, turn) as number) / 100
  const sign = pawns > 0 ? '+' : pawns < 0 ? '-' : ''
  return `${sign}${Math.abs(pawns).toFixed(2)}`
}
