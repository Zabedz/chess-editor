/* Renders the static page layout: header, palette column, board column, and
   evaluation column, and returns typed handles to the containers and controls
   that later steps populate and wire. */

export interface ShellRefs {
  palette: HTMLElement
  board: HTMLElement
  evalPanel: HTMLElement
  turnButtons: HTMLButtonElement[]
  backButton: HTMLButtonElement
  forwardButton: HTMLButtonElement
  clearButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  flipButton: HTMLButtonElement
  themeButton: HTMLButtonElement
  settingsButton: HTMLButtonElement
  loadForm: HTMLFormElement
  loadInput: HTMLTextAreaElement
  loadError: HTMLElement
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
          <button type="button" class="icon-btn icon-only" data-settings aria-label="Open settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </header>

      <div class="app">
        <aside class="panel col-palette" aria-label="Piece palette">
          <h2 class="panel-title">Pieces</h2>
          <p class="panel-hint">Drag onto the board. The order follows the board side.</p>
          <div class="palette-groups" id="palette"></div>
        </aside>

        <section class="col-board">
          <div class="board-wrap"><div class="board" id="board"></div></div>
          <div class="board-tools">
            <button type="button" class="tool nav" data-action="back" title="Undo the last edit (Left arrow)" aria-label="Undo the last edit" disabled>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5l-5 5 5 5"/></svg>
              Back
            </button>
            <button type="button" class="tool nav" data-action="forward" title="Play the suggested move (Right arrow)" aria-label="Play the suggested move" disabled>
              Forward
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5l5 5-5 5"/></svg>
            </button>
            <span class="tool-sep" aria-hidden="true"></span>
            <button type="button" class="tool" data-action="clear">Clear board</button>
            <button type="button" class="tool reset" data-action="reset">Reset</button>
            <button type="button" class="tool" data-action="flip" title="Flip board (f)" aria-label="Flip board">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 6l3-3 3 3"/><path d="M10 3v6"/><path d="M7 14l3 3 3-3"/><path d="M10 11v6"/></svg>
              Flip
            </button>
          </div>
        </section>

        <div class="col-eval">
          <aside class="panel" id="eval" aria-labelledby="eval-heading">
            <h2 class="panel-title" id="eval-heading">Evaluation</h2>
            <p class="eval-idle">Place pieces to see the engine's best move.</p>
          </aside>
          <form class="panel position-loader" data-el="loader" novalidate>
            <label class="loader-label" for="position-input">Load a position</label>
            <textarea id="position-input" class="loader-input" rows="2" spellcheck="false" autocomplete="off" placeholder="Paste a FEN or PGN"></textarea>
            <div class="loader-row">
              <button type="submit" class="tool loader-load">Load</button>
              <p class="loader-error" data-el="loadError" role="alert"></p>
            </div>
          </form>
        </div>
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
    backButton: must(root.querySelector('button[data-action="back"]'), 'back button'),
    forwardButton: must(root.querySelector('button[data-action="forward"]'), 'forward button'),
    clearButton: must(root.querySelector('button[data-action="clear"]'), 'clear button'),
    resetButton: must(root.querySelector('button[data-action="reset"]'), 'reset button'),
    flipButton: must(root.querySelector('button[data-action="flip"]'), 'flip button'),
    themeButton: must(root.querySelector('button[data-theme-toggle]'), 'theme button'),
    settingsButton: must(root.querySelector('button[data-settings]'), 'settings button'),
    loadForm: must(root.querySelector('.position-loader'), 'load form'),
    loadInput: must(root.querySelector('.loader-input'), 'load input'),
    loadError: must(root.querySelector('[data-el="loadError"]'), 'load error'),
  }
}

function must<T extends Element>(el: T | null, name: string): T {
  if (!el) throw new Error(`shell is missing element: ${name}`)
  return el
}
