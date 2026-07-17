import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Copies the Stockfish build the app serves out of node_modules into
// public/engine/ so it loads same-origin. Runs on install (postinstall) and
// keeps the served engine in step with the installed package version.

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const stockfishRoot = dirname(require.resolve('stockfish/package.json'))
const binDir = join(stockfishRoot, 'bin')
const outDir = join(projectRoot, 'public', 'engine')

mkdirSync(outDir, { recursive: true })

for (const file of ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']) {
  copyFileSync(join(binDir, file), join(outDir, file))
}
copyFileSync(join(stockfishRoot, 'Copying.txt'), join(outDir, 'COPYING.txt'))

console.log(`Copied Stockfish engine files into ${outDir}`)
