import type { Square } from './types.ts'

/** The squares strictly between `from` and `to` when they lie on a rank, file,
    or diagonal (a sliding move). Empty for a knight jump or a one-step move, so
    only sliding moves get a travel path. */
export function pathBetween(from: Square, to: Square): readonly Square[] {
  const fromFile = from.charCodeAt(0) - 97
  const fromRank = Number(from[1]) - 1
  const toFile = to.charCodeAt(0) - 97
  const toRank = Number(to[1]) - 1

  const fileSpan = Math.abs(toFile - fromFile)
  const rankSpan = Math.abs(toRank - fromRank)
  const straight = fromFile === toFile || fromRank === toRank || fileSpan === rankSpan
  if (!straight) return []

  const fileStep = Math.sign(toFile - fromFile)
  const rankStep = Math.sign(toRank - fromRank)
  const steps = Math.max(fileSpan, rankSpan)

  const path: Square[] = []
  for (let i = 1; i < steps; i++) {
    const file = String.fromCharCode(97 + fromFile + fileStep * i)
    const rank = fromRank + rankStep * i + 1
    path.push(`${file}${rank}` as Square)
  }
  return path
}
