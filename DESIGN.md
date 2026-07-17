# Design

Visual and interaction design for the chess position editor with engine
evaluation. This is the reference the build follows. Colour values, spacing, and
layout here are authoritative.

## Product in one line

A single page where you build any chess position by dragging pieces onto a
board, pick whose turn it is, and see the engine's best move with its from and
to squares coloured on the board.

## Screen layout

Desktop (>= 1040px) is a three-column row with the board in the middle:

```
+---------------------------------------------------------------+
|  Header: title            [ White to move | Black to move ]   |
+------------+-------------------------------+------------------+
|  Palette   |                               |  Evaluation      |
|  (white)   |          Chess board          |  - eval bar      |
|  (black)   |          8x8, coords          |  - score         |
|            |                               |  - best move     |
|  [Clear]   |                               |  - depth/status  |
|  [Reset]   |                               |                  |
+------------+-------------------------------+------------------+
```

- Left column, fixed 150 to 180px: the piece palette (white set, then black
  set), and under it the two board controls, Clear board and Reset.
- Centre column, flexible: the board, sized to stay square, with file letters
  and rank numbers.
- Right column, fixed 300 to 340px: the evaluation panel.

The turn toggle sits in the header so it reads as a top-level mode that the
evaluation follows. The eval panel repeats the current side to move as a small
label so the two never drift apart in the user's eye.

### Responsive behaviour

- `>= 1040px`: three columns as above.
- `640px to 1039px`: header on top, then board centred, then the palette as a
  horizontal wrapping strip, then the evaluation panel full width. Controls move
  next to the palette strip.
- `< 640px`: everything stacks in one column. Board takes the full width up to
  its max. Palette becomes a horizontal scrolling strip. Eval panel full width.

Board sizing: `min(92vw, 72vh, 640px)`, always square, centred in its column.

## Colour scheme

Dark theme is the primary look. All colours are CSS variables so a light theme
is a variable swap later.

App chrome:

| Token              | Value      | Use                                  |
|--------------------|------------|--------------------------------------|
| `--bg`             | `#17181C`  | page background                      |
| `--surface`        | `#212227`  | panels, palette, eval card           |
| `--surface-2`      | `#2A2B31`  | raised controls, buttons             |
| `--surface-3`      | `#34353D`  | button hover                         |
| `--border`         | `#33343B`  | hairlines, panel edges               |
| `--text`           | `#ECECEE`  | primary text                         |
| `--muted`          | `#9A9BA3`  | secondary text, coordinates          |
| `--accent`         | `#7FB2F0`  | focus rings, links, active toggle    |
| `--on-accent`      | `#17181C`  | text on an accent fill (flips light) |

Board squares (a familiar green board):

| Token              | Value      | Use                                  |
|--------------------|------------|--------------------------------------|
| `--sq-light`       | `#EEEED2`  | light squares                        |
| `--sq-dark`        | `#769656`  | dark squares                         |
| `--coord-on-light` | `#769656`  | coordinate text on a light square    |
| `--coord-on-dark`  | `#EEEED2`  | coordinate text on a dark square     |

Suggested-move highlight (the core feature, tile colouring):

| Token              | Value                       | Use                     |
|--------------------|-----------------------------|-------------------------|
| `--from-fill`      | `rgba(255, 204, 77, 0.55)`  | origin square overlay   |
| `--path-fill`      | `rgba(90, 200, 120, 0.24)`  | squares travelled through |
| `--to-fill`        | `rgba(90, 200, 120, 0.62)`  | destination square      |
| `--to-ring`        | `rgba(46, 160, 87, 0.95)`   | inset ring on target    |

Origin is amber, destination is green with an inset ring, so from and to read as
distinct at a glance and stay legible over both light and dark squares. For a
sliding move (rook, bishop, queen) the squares the piece passes over are tinted
the destination hue at about a third of its opacity, a faint trail from origin
to destination. Knights and single-step moves have no travel squares. The from,
path, and to squares never overlap, so each keeps one colour.

Evaluation sentiment:

| Token              | Value      | Use                                  |
|--------------------|------------|--------------------------------------|
| `--eval-white`     | `#E9EAEC`  | white-advantage side of the eval bar |
| `--eval-black`     | `#3A3B42`  | black-advantage side of the eval bar |
| `--good`           | `#6FCF97`  | positive score text                  |
| `--bad`            | `#E57373`  | negative score text, error state     |
| `--mate`           | `#F2C14E`  | mate score text                      |

## Typography

- UI text: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Numeric and code (score, FEN, UCI move): `ui-monospace, "SF Mono", Menlo,
  monospace`.
- Scale: header 20px/650, panel eyebrow titles 11px/650 uppercase with 0.07em
  tracking, body 14px, coordinates 10px, eval score 34px/700 mono, best move
  18px mono.
- The base `:root` palette is the dark set above; the light values apply under
  `prefers-color-scheme: light`. Text on an accent fill uses `--on-accent`,
  which flips so contrast stays readable in both themes.

## Component detail

### Board

- 8x8 CSS grid, white at the bottom (rank 1 to 8 bottom to top, files a to h
  left to right).
- Each square is a `<div data-square="e4">` with a light or dark class.
- File letters render in the bottom rank squares, rank numbers in the left file
  squares, in the corner, using the on-square coordinate colours above, small
  and low weight so they sit under the pieces.
- Pieces are SVG images centred in the square at about 90% of the square size.
- Highlight is a full-square overlay via a `::after` pseudo-element toggled with
  `.square.hl-from` and `.square.hl-to` classes. The overlay never blocks
  pointer events.

### Piece palette

- Two labelled groups, White and Black, each with the six roles in reading order
  king, queen, rook, bishop, knight, pawn.
- Each swatch is the piece SVG on a `--surface-2` tile with a subtle border,
  sized like a board square at rest and scaling down on narrow screens.
- Grab affordance: `cursor: grab`, and `grabbing` while dragging. A dragged
  piece shows a floating ghost that follows the pointer.
- Dropping a palette piece on a square places it. Dropping off the board does
  nothing.

### Board drag behaviour

One pointer interaction model covers all three cases:

- Drag a palette swatch onto a square: place that piece.
- Drag a piece already on the board to another square: move it (overwrites any
  piece there).
- Drag a piece off the board edge: remove it.

Uses the Pointer Events API with `setPointerCapture`, a floating ghost, and
`elementFromPoint` on release to find the target square. `touch-action: none` on
the board and palette so touch drags do not scroll the page.

### Controls

- Clear board: empties every square. The eval panel then shows an idle empty
  state.
- Reset: restores the standard starting position and sets the turn to White.
- Both are `--surface-2` buttons with a visible focus ring and hover to
  `--surface-3`. Reset carries a slightly stronger outline since it is the
  common return action.

### Turn toggle

- A two-segment control in the header, White to move and Black to move. The
  active segment fills with `--accent` and reads as pressed (aria-pressed). It
  starts on White, and the starting position and Reset are White to move.
- Moving a piece from one square to another flips the side to move, so moves
  alternate the turn (White, then Black, then White, and so on) whatever colour
  was moved. Placing a piece from the palette or dragging one off the board to
  delete it is a position edit and keeps the current side to move.
- The user can override the side to move at any time by clicking the toggle;
  later moves alternate from whatever was set.
- Changing the turn, by a move or the toggle, re-runs the evaluation for the new
  side.

### Evaluation panel

Top to bottom:

- Panel title, EVALUATION.
- A horizontal eval bar. It fills from the white side proportional to the score,
  clamped, with a centre line at equality. A mate score fills fully to the
  winning side.
- The numeric score in mono, normalised to White's point of view. `+1.24`,
  `-0.80`, or `#3` / `#-2` for mate. Positive is green, negative red, mate amber.
- Best move, shown in algebraic notation with the raw UCI move under it, for
  example `Ng1-f3` and `g1f3`.
- A status line: engine state (Loading engine, Thinking at depth N, Ready) and
  the searched depth.
- A small side-to-move label mirroring the header toggle.

Panel states:

- Loading: while the engine boots, show Loading engine with a quiet progress
  shimmer, no score.
- Thinking: while a search runs, show the running depth and a subtle spinner.
- Ready: score, best move, and highlighted tiles.
- Illegal position: a plain message naming why (for example, White has no king,
  or Black is in check on White's move) and no engine call.
- No legal move: Checkmate or Stalemate, with no best move.
- Empty board: an idle prompt to place pieces.
- Engine error: a plain failure line if the engine cannot load.

## Motion

- Piece placement and highlight changes fade in over 120ms.
- The eval bar animates its fill over 200ms with an ease-out curve.
- Honour `prefers-reduced-motion: reduce` by dropping these transitions.

## Accessibility

- Squares and palette swatches are focusable and operable, with aria labels
  naming the piece and square.
- The turn toggle and control buttons have clear focus rings using `--accent`.
- Colour is not the only signal: the destination ring and the text labels back
  up the tile colours for the suggested move.
- Contrast of text on surfaces meets WCAG AA.

## Why these choices

- Colouring the from and to tiles for the best move matches what the task asks
  for and what chessnextmove.com does, and it stays readable on a small board
  with no SVG overlay plumbing.
- A green board with the cburnett piece set is the visual most chess players
  already recognise, which lowers the learning cost of the editor.
- Dark chrome around a bright board keeps attention on the board and the score,
  and gives the highlight colours a stable backdrop.
