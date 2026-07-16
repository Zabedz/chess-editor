import { defineConfig } from 'vite'

// Cross-origin isolation lets the page use SharedArrayBuffer, which the
// multi-threaded Stockfish build needs. Preview does not inherit server
// headers, so both are set. Production hosting must send the same two headers.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
})
