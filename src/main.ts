import './styles/tokens.css'
import './styles/app.css'
import './styles/about.css'
import { mountShell } from './ui/shell.ts'
import { App } from './app.ts'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('missing #app mount element')

new App(mountShell(root))
