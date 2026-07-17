import './styles/tokens.css'
import './styles/app.css'
import { mountShell } from './ui/shell.ts'
import { BoardModel } from './board/model.ts'
import { BoardView } from './board/view.ts'
import { DragController } from './board/dnd.ts'
import { mountPalette } from './board/palette.ts'
import { wireControls } from './ui/controls.ts'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('missing #app mount element')

const refs = mountShell(root)
const model = new BoardModel()
new BoardView(refs.board, model)

const drag = new DragController(model, refs.board)
drag.attach()
mountPalette(refs.palette, drag)
wireControls(refs, model)
