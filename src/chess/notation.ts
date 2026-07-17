import { Chess } from 'chess.js'

/** Converts a UCI move (such as "g1f3" or "e7e8q") to standard algebraic
    notation for the given position, or null if the move is not legal there. */
export function sanForMove(fen: string, uci: string): string | null {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci.length > 4 ? uci[4] : undefined

  const game = new Chess(fen, { skipValidation: true })
  const move = game
    .moves({ verbose: true })
    .find((candidate) => {
      if (candidate.from !== from || candidate.to !== to) return false
      if (!candidate.promotion) return true
      // A promoting move whose UCI omits the piece letter defaults to a queen.
      return candidate.promotion === (promotion ?? 'q')
    })
  return move ? move.san : null
}
