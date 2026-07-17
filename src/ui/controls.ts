import type { BoardModel } from '../board/model.ts'
import type { ShellRefs } from './shell.ts'

/** Connects the Clear and Reset buttons and the turn toggle to the model, and
    keeps the toggle in sync with the model's turn (so Reset, which returns to
    White, also updates the toggle). */
export function wireControls(refs: ShellRefs, model: BoardModel): void {
  refs.clearButton.addEventListener('click', () => model.clear())
  refs.resetButton.addEventListener('click', () => model.reset())

  for (const button of refs.turnButtons) {
    button.addEventListener('click', () => {
      const turn = button.dataset.turn
      if (turn === 'w' || turn === 'b') model.setTurn(turn)
    })
  }

  const syncTurn = (): void => {
    const turn = model.getTurn()
    for (const button of refs.turnButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.turn === turn))
    }
  }
  model.subscribe(syncTurn)
  syncTurn()
}
