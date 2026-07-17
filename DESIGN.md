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
|  Palette   |          Chess board          |  Evaluation      |
|  (top)     |          8x8, coords          |  - eval bar      |
|  (bottom)  |                               |  - score         |
|            |  [ Back ][ Forward ]|[C][R][F]|  - best move     |
|            |                               |  - depth/status  |
|            |                               +------------------+
|            |                               |  Load a position |
|            |                               |  [ FEN or PGN ]  |
+------------+-------------------------------+------------------+
```

- Left column, fixed 150 to 180px: the piece palette. The two colour groups sit
  in board order, so the colour at the bottom of the board is the lower group.
- Centre column, flexible: the board, sized to stay square, with file letters
  and rank numbers, and a toolbar row under it that spans the full board width
  (Back and Forward move navigation, a divider, then Clear board, Reset, and
  Flip).
- Right column, fixed 300 to 340px: the evaluation panel, which also shows the
  current FEN with a Copy button, and below it the load box for pasting a FEN or
  PGN.

The turn toggle sits in the header so it reads as a top-level mode that the
evaluation follows. The eval panel repeats the current side to move as a small
label so the two never drift apart in the user's eye.

### Responsive behaviour

- `>= 1040px`: three columns as above.
- `640px to 1039px`: header on top, then board with its toolbar centred, then
  the palette as a horizontal wrapping strip, then the evaluation panel with the
  load box beneath it, full width.
- `< 640px`: everything stacks in one column. Board takes the full width up to
  its max. Palette becomes a horizontal scrolling strip. Eval panel, then the
  load box, full width.

Board sizing: `min(100%, calc(100vh - var(--board-v-reserve)), 640px)`, always
square, centred in its column. The reserve (about 188px) is the vertical space
the header, paddings, toolbar, and gaps take, so the board shrinks before the
column overflows the viewport (DDR-01). The board and the toolbar
under it share one `--board-size` token, so the toolbar is always exactly as
wide as the board and never drifts off-centre.

### Design decision records

**DDR-01: the three-column tool fits the viewport at 100% zoom above the fold.**
The reference viewport is 1280x800 (the common design fold, and the Mac default
logical resolution). At 100% browser zoom the primary three-column view is fully
usable there without scrolling to reach any control. The board is the height
slack: it is capped at `calc(100vh - var(--board-v-reserve))`, so it shrinks on
a shorter window and the column stays within the fold. Informational page
content (the About, How-to, and FAQ sections and the footer, which carry the
page's crawlable text) sits below the tool and is reached by scrolling; it is
outside `#app` so the app never renders over it. This is a standing constraint
on all future layout work:

- Secondary controls belong in a column with vertical slack, like the right
  rail. The FEN/PGN load box lives under the evaluation panel for this reason:
  it stays above the fold, and the board area never has to scroll to reach a
  control.
- A new control placed below the board is measured against this budget first; if
  it does not fit, it moves to a side column or behind a disclosure.
- The right rail (the eval panel at its tallest state plus the load box) is not
  height-capped, so it sets the page's minimum height. Keep it within the
  board-plus-reserve budget; the board scales to whatever height is left.
- `e2e/layout.spec.ts` asserts the three-column tool fits within 1280x800 and
  1440x900 (its bottom edge and the load box both stay inside the viewport), so a
  regression fails the suite. Shorter viewports scale the board down and keep
  both side panels in view.

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

- 8x8 CSS grid. White at the bottom by default (rank 1 to 8 bottom to top, files
  a to h left to right); Flip swaps to Black at the bottom (rank 8 to 1, files h
  to a). A square keeps its own light or dark colour in either orientation, so
  the colour comes from the square name, not its grid position.
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
  king, queen, rook, bishop, knight, pawn. The group order follows the board
  orientation: the colour at the bottom of the board is the lower group, so
  Flip swaps the two groups to keep the palette aligned with the board.
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

Castling is the one move where a single drag relocates two pieces. Dragging the
king its two squares along the home rank toward a friendly corner rook, with the
squares between them empty (e1 to g1 or c1, e8 to g8 or c8), moves the rook to
the king's far side in the same step, so it undoes as one. This is the same
gesture lichess and chess.com use, so it needs no extra control. Any other king
move, including a two-square move with no corner rook or a blocked path, stays a
plain one-piece move, so free-form editing is unaffected.

### Board toolbar

A single row directly under the board, so the board actions stay next to the
board they act on. The row is exactly the board's width. It has two groups split
by a thin divider: move navigation (Back, Forward) on the left, board setup
(Clear, Reset, Flip) on the right. Back and Forward grow to absorb the leftover
width, so the group spans the board edge to edge, while Clear, Reset, and Flip
keep their natural width.

- Back: undoes the last edit, whether a piece was spawned, removed, or moved.
  The turn toggle is not an edit, so it is not undone. Disabled when the history
  is empty. Bound to the Left arrow key. Its label is a left chevron and Back.
- Forward: plays the engine's suggested move, which flips the turn and starts a
  fresh search on the new position. A promotion in the suggested move lands the
  promoted piece, and a castle (the engine emits it as the king's two-square
  move, such as e1g1) moves the rook with the king. Disabled when there is no
  suggested move (empty, illegal, terminal, or still searching). Bound to the
  Right arrow key. Its label is Forward and a right chevron.
- Clear board: empties every square. The eval panel then shows an idle empty
  state.
- Reset: restores the standard starting position and sets the turn to White.
- Flip: swaps the board orientation and, with it, the palette group order. It is
  a view control, so it leaves the position, the side to move, and the FEN
  untouched. Also bound to the `f` key when focus is not in a text field. Its
  label pairs a small vertical two-way arrow icon with the word Flip.
- The keyboard shortcuts (Left, Right, `f` by default) fire only on a bare key
  press, so browser and text-field shortcuts keep working. All four are
  rebindable in the settings panel.
- All are `--surface-2` buttons with a visible focus ring and hover to
  `--surface-3`. A disabled button drops to 40% opacity. Reset carries a
  slightly stronger outline since it is the common return action.

### Load a position

In the right column, docked under the evaluation panel as its own card, a
labelled box takes a FEN or a PGN so a position can be set without dragging every
piece. It sits in the right rail so the page fits the viewport at 100% zoom (see
DDR-01).

- A two-row monospace text field with the placeholder "Paste a FEN or PGN" and a
  Load button. Load also fires on Cmd/Ctrl+Enter; a plain Enter adds a newline,
  so a multi-line PGN can be pasted or typed.
- A FEN is recognised by the slashes in its first field and read for placement
  and side to move. Anything else is played out as a PGN to its final position.
  Castling and en passant are dropped, matching how the editor serialises its
  own FEN.
- A load replaces the whole position and is a normal edit, so Back undoes it.
- Invalid input leaves the board untouched and shows an inline error that names
  the problem (for example, the side to move is not w or b). The error clears on
  the next keystroke.
- The eval panel's FEN readout has a Copy button, so the round trip of copy,
  edit, and load works from the app alone.

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

### Settings

A cogwheel in the header opens a modal settings dialog (a native `<dialog>`,
closed by Escape, the close icon, Done, or a click on the backdrop). It uses the
app's chrome, with grouped sections, toggle switches, sliders, and a footer that
carries Restore defaults and Done. Every change applies at once and saves to
localStorage, so the choices survive a reload.

- Sound: a Sound effects toggle and a Volume slider. Move and capture clicks are
  synthesised with the Web Audio API (a short triangle blip with a fast decay,
  lower for a capture), so the app ships no audio files. The context is created
  on the first play, inside a user gesture, to satisfy the autoplay policy.
- Board: four colour themes (Green, Blue, Slate, Brown) shown as mini checker
  swatches; a theme swaps the two square colours through CSS variables. Show
  coordinates and Show move highlight are visibility toggles driven by a root
  data attribute.
- Engine: a Search depth slider from 6 to 22 (default 15) that feeds the
  Stockfish search. Changing it re-runs the current search.
- Keyboard shortcuts: a row per action (Undo, Play best, Flip, Reset) showing the
  current key with a Change button. Change starts recording; the next key press
  binds it, and a key already used by another action is refused with a note.
  While the dialog is open the board shortcuts are inert, so a rebind is captured
  cleanly.

## Motion

- Piece placement and highlight changes fade in over 120ms.
- The eval bar animates its fill over 200ms with an ease-out curve.
- Honour `prefers-reduced-motion: reduce` by dropping these transitions.

## Accessibility

- Squares and palette swatches are focusable and operable, with aria labels
  naming the piece and square.
- The turn toggle and control buttons have clear focus rings using `--accent`.
- Colour is not the only signal: the destination ring and the best-move notation
  (which names the from and to squares) back up the tile colours for the
  suggested move.
- Contrast of text on surfaces meets WCAG AA.

## Why these choices

- Colouring the from and to tiles for the best move matches what the task asks
  for and what chessnextmove.com does, and it stays readable on a small board
  with no SVG overlay plumbing.
- A green board with the cburnett piece set is the visual most chess players
  already recognise, which lowers the learning cost of the editor.
- Dark chrome around a bright board keeps attention on the board and the score,
  and gives the highlight colours a stable backdrop.
