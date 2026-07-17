import { defineConfig } from 'vite'

// The app ships the single-threaded Stockfish build, which needs no special
// headers. A multi-threaded build would instead require cross-origin isolation
// (Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy:
// require-corp) set here and on the production server so SharedArrayBuffer works.
export default defineConfig({})
