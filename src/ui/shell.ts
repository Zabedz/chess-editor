/* Renders the static page layout: header, palette column, board column, and
   evaluation column, and returns typed handles to the containers and controls
   that later steps populate and wire. */

export interface ShellRefs {
  palette: HTMLElement
  board: HTMLElement
  evalPanel: HTMLElement
  turnButtons: HTMLButtonElement[]
  clearButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  themeButton: HTMLButtonElement
}

export function mountShell(root: HTMLElement): ShellRefs {
  root.innerHTML = `
    <div class="wrap">
      <header>
        <div class="brand">
          <h1>Chess Position Editor</h1>
          <span class="sub">Stockfish 18</span>
        </div>
        <div class="header-right">
          <div class="turn" role="group" aria-label="Side to move">
            <button type="button" data-turn="w" data-color="w" aria-pressed="true">
              <span class="dot"></span>White to move
            </button>
            <button type="button" data-turn="b" data-color="b" aria-pressed="false">
              <span class="dot"></span>Black to move
            </button>
          </div>
          <button type="button" class="icon-btn" data-theme-toggle>Dark</button>
        </div>
      </header>

      <div class="app">
        <aside class="panel col-palette" aria-label="Piece palette">
          <h2 class="panel-title">Pieces</h2>
          <div class="palette-groups" id="palette"></div>
          <div class="controls">
            <button type="button" class="btn" data-action="clear">Clear board</button>
            <button type="button" class="btn btn--reset" data-action="reset">Reset</button>
          </div>
        </aside>

        <section class="col-board">
          <div class="board-wrap"><div class="board" id="board"></div></div>
          <p class="board-caption">
            The engine's best move colours its <b>from</b> and <b>to</b> squares
            and the squares the piece <b>travels through</b>.
          </p>
        </section>

        <aside class="panel col-eval" id="eval" aria-labelledby="eval-heading">
          <h2 class="panel-title" id="eval-heading">Evaluation</h2>
          <p class="eval-idle">Place pieces to see the engine's best move.</p>
        </aside>
      </div>
    </div>
  `

  return {
    palette: must(root.querySelector('#palette'), '#palette'),
    board: must(root.querySelector('#board'), '#board'),
    evalPanel: must(root.querySelector('#eval'), '#eval'),
    turnButtons: [
      must(root.querySelector('button[data-turn="w"]'), 'turn white button'),
      must(root.querySelector('button[data-turn="b"]'), 'turn black button'),
    ],
    clearButton: must(root.querySelector('button[data-action="clear"]'), 'clear button'),
    resetButton: must(root.querySelector('button[data-action="reset"]'), 'reset button'),
    themeButton: must(root.querySelector('button[data-theme-toggle]'), 'theme button'),
  }
}

function must<T extends Element>(el: T | null, name: string): T {
  if (!el) throw new Error(`shell is missing element: ${name}`)
  return el
}
