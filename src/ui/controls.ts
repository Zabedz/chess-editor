import type { BoardModel } from '../board/model.ts'
import { loadPosition } from '../chess/load.ts'
import type { ShellRefs } from './shell.ts'

/** Connects the Clear and Reset buttons, the turn toggle, and the FEN/PGN load
    box to the model, and keeps the toggle in sync with the model's turn (so
    Reset, which returns to White, also updates the toggle). */
export function wireControls(refs: ShellRefs, model: BoardModel): void {
  refs.clearButton.addEventListener('click', () => model.clear())
  refs.resetButton.addEventListener('click', () => model.reset())

  for (const button of refs.turnButtons) {
    button.addEventListener('click', () => {
      const turn = button.dataset.turn
      if (turn === 'w' || turn === 'b') model.setTurn(turn)
    })
  }

  wireLoader(refs, model)

  const syncTurn = (): void => {
    const turn = model.getTurn()
    for (const button of refs.turnButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.turn === turn))
    }
  }
  model.subscribe(syncTurn)
  syncTurn()
}

/** Loads a FEN or PGN into the model, or shows why it could not be read. A load
    replaces the position and is a normal edit, so Back can undo it. */
function wireLoader(refs: ShellRefs, model: BoardModel): void {
  const load = (): void => {
    const result = loadPosition(refs.loadInput.value)
    if (!result.ok) {
      refs.loadError.textContent = result.error
      return
    }
    refs.loadError.textContent = ''
    refs.loadInput.value = ''
    model.setPosition(result.position.pieces, result.position.turn, result.position.enPassant)
  }

  refs.loadForm.addEventListener('submit', (event) => {
    event.preventDefault()
    load()
  })
  refs.loadInput.addEventListener('input', () => {
    refs.loadError.textContent = ''
  })
  refs.loadInput.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      load()
    }
  })
}
