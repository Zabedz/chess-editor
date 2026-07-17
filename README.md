# Chess Position Editor

A single page for building any chess position and seeing the engine's best move.
Drag pieces from the palette onto the board, drag pieces around or off the
board, pick whose turn it is, and Stockfish evaluates the position and colours
the from and to squares of its suggested move.

## Features

- An 8x8 board that starts from the standard position.
- A palette of all twelve pieces (six roles in white and black) that you drag
  onto the board. You can place any number of pieces in any arrangement.
- Drag a piece between squares to move it, or off the board to delete it.
- Clear board and Reset controls.
- A White / Black turn toggle. A move flips the side to move, so moves alternate
  the turn; you can also set it by hand.
- An evaluation panel with a score bar, the numeric score from White's point of
  view, the best move in algebraic and UCI notation, the search depth, and the
  position's FEN. It reports illegal positions, checkmate, and stalemate.
- A light and dark theme that follows the system preference and can be toggled.

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8 does not support the 21.x line), and npm.

## Setup

```sh
npm install
```

Install copies the single-threaded Stockfish build out of the `stockfish`
package into `public/engine/` (see `scripts/copy-engine.mjs`). The `dev` and
`build` scripts recopy it, so it is restored automatically if the folder is
cleaned.

## Run

```sh
npm run dev       # start the dev server
npm run build     # type-check and build to dist/
npm run preview   # serve the built app
```

## Test

```sh
npm test          # unit tests (Vitest)
npm run test:e2e  # end-to-end tests (Playwright, boots the dev server)
npm run test:all  # both
```

The Playwright browser is installed with `npx playwright install chromium`.

## Deployment

The build is a set of static files in `dist/`, so any static host can serve
them. Two workflows drive CI:

- `.github/workflows/tests.yml` runs the type-check, unit tests, and end-to-end
  tests on every pull request and on pushes to `main`.
- `.github/workflows/deploy.yml` builds and deploys the site to GitHub Pages. It
  runs only when started by hand from the Actions tab (Run workflow); pushes do
  not deploy.

The public base path is set at build time from `BASE_PATH` (default `/`), so one
build serves from a project-page subpath or a domain root:

- The deploy workflow reads the base from the site URL (`actions/configure-pages`),
  so a project page builds with `/chess-editor/` while a user page or a custom
  domain at the root builds with `/`, no code change either way.
- Local `dev` and `preview` use `/`. To preview the subpath build, run
  `BASE_PATH=/chess-editor/ npm run build` then
  `BASE_PATH=/chess-editor/ npm run preview`.

One-time repository setup: in Settings > Pages, set the source to GitHub Actions.
To move to a custom domain later (for example fronted by Cloudflare), set the
domain in Settings > Pages; the deploy workflow then resolves the base to `/` for
you.

The canonical link, Open Graph tags, `sitemap.xml`, and `robots.txt` use an
absolute site URL from `SITE_URL` (default the project page). The deploy workflow
sets it from the Pages URL, so it follows a custom domain the same way the base
path does. On a project page `robots.txt` sits at the subpath and browsers only
read it from the domain root, so submit the sitemap through Search Console until
the site serves from a root domain.

The favicon, home-screen icon, and Open Graph image are `public/favicon.svg` and
the committed PNGs in `public/`. After changing the knight mark or the share-card
wording, regenerate the PNGs with `node scripts/gen-og-assets.mjs`, which renders
them through the Playwright browser.

## How it works

- The board is a plain CSS grid of squares with SVG pieces. Drag and drop uses
  the Pointer Events API, so one controller handles placing, moving, and
  deleting.
- The `src/chess/` domain layer builds and parses FEN (`fen.ts`) and gates
  legality (`status.ts`): one king per side, no back-rank pawns, and the side
  not to move not left in check. It uses `chess.js` for check, checkmate,
  stalemate, and algebraic notation. This layer stays free of any DOM.
- Stockfish runs as a Web Worker and is driven over UCI. `src/engine/uci.ts`
  parses its output; `src/engine/stockfish.ts` owns the worker and runs one
  search at a time, superseding an older search when the position changes.
- `src/app.ts` ties the board, turn, engine, and panel together. On each edit it
  debounces, classifies the position, and either shows the illegal or terminal
  state or asks the engine for the best move and highlights the two squares.

## Accessibility

The controls (turn toggle, Clear, Reset, and the theme button) are keyboard
focusable and operable, with visible focus rings and a reduced-motion mode.
Piece editing is pointer based (drag and drop); moving pieces with the keyboard
alone is not supported.

## Licenses of bundled work

- `chess.js` is under the BSD-2-Clause license.
- The Stockfish engine (the `stockfish` package, Stockfish.js by Nathan Rugg) is
  under the GNU General Public License v3. Its files are copied into
  `public/engine/` at install with the license text as `COPYING.txt`.
- The cburnett chess piece SVGs are by Colin M.L. Burnett, used under the
  3-clause BSD option of their multi-license (see `public/pieces/LICENSE`).
