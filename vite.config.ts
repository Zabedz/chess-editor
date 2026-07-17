import { defineConfig } from 'vite'

// The app ships the single-threaded Stockfish build, which needs no special
// headers. A multi-threaded build would instead require cross-origin isolation
// (Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy:
// require-corp) set here and on the production server so SharedArrayBuffer works.
//
// base comes from BASE_PATH so one build serves from a project-page subpath
// (BASE_PATH=/chess-editor/) or a domain root (the default /). The Pages
// workflow derives it from the deploy URL, so a Cloudflare custom domain at the
// root works with no code change. pieces.ts and stockfish.ts read
// import.meta.env.BASE_URL so their runtime asset URLs follow the same base.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
})
