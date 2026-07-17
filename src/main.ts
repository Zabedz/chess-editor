import './styles/tokens.css'
import './styles/app.css'
import { mountShell } from './ui/shell.ts'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('missing #app mount element')

mountShell(root)
