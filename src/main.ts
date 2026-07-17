import './styles/tokens.css'
import './styles/app.css'
import { mountShell } from './ui/shell.ts'
import { BoardModel } from './board/model.ts'
import { BoardView } from './board/view.ts'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('missing #app mount element')

const refs = mountShell(root)
const model = new BoardModel()
new BoardView(refs.board, model)
