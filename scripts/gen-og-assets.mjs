import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

// Rasterises the branded icons and the social share image from the same knight
// mark the board uses, so the favicon, home-screen icon, and Open Graph card
// stay in step with public/favicon.svg. Run by hand after the mark or wording
// changes: `node scripts/gen-og-assets.mjs`. The PNG outputs are committed, so
// the build and CI never need a browser.

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(projectRoot, 'public')

const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8')
const knightSvg = readFileSync(join(publicDir, 'pieces', 'cburnett', 'wN.svg'), 'utf8')

// The home-screen icon wants a full-bleed square; iOS applies its own rounded
// mask. Drop the SVG's own corner radius for that one output.
const squareFaviconSvg = faviconSvg.replace('rx="9"', 'rx="0"')

function iconPage(svg, size) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0}
    #icon{width:${size}px;height:${size}px}
    #icon svg{display:block;width:100%;height:100%}
  </style></head><body><div id="icon">${svg}</div></body></html>`
}

function checkerCells() {
  let cells = ''
  for (let rank = 0; rank < 4; rank++) {
    for (let file = 0; file < 4; file++) {
      cells += `<i class="${(rank + file) % 2 === 0 ? 'l' : 'd'}"></i>`
    }
  }
  return cells
}

const ogPage = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0}
  body{
    width:1200px;height:630px;background:#17181c;color:#ececee;
    font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    display:flex;
  }
  .pad{padding:72px 80px;display:flex;align-items:center;gap:64px;width:100%;box-sizing:border-box}
  .text{flex:1}
  .eyebrow{color:#7fb2f0;font-size:23px;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:22px}
  h1{font-size:82px;line-height:1.02;letter-spacing:-0.02em;font-weight:700;margin:0 0 26px}
  p{font-size:31px;line-height:1.35;color:#9a9ba3;margin:0;max-width:600px}
  .board{
    position:relative;flex:0 0 auto;width:308px;height:308px;border-radius:20px;overflow:hidden;
    display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);
    box-shadow:0 24px 64px rgba(0,0,0,0.5)
  }
  .board i{display:block}
  .board i.l{background:#eeeed2}
  .board i.d{background:#769656}
  .knight{position:absolute;left:13%;top:11%;width:74%;height:74%;filter:drop-shadow(0 8px 12px rgba(0,0,0,0.4))}
  .knight svg{display:block;width:100%;height:100%}
</style></head><body>
  <div class="pad">
    <div class="text">
      <div class="eyebrow">Stockfish 18 &middot; in your browser</div>
      <h1>Chess Position Editor</h1>
      <p>Set up any position and read the engine's best move, score, and search depth.</p>
    </div>
    <div class="board">${checkerCells()}<div class="knight">${knightSvg}</div></div>
  </div>
</body></html>`

const browser = await chromium.launch()
try {
  for (const { svg, size, out } of [
    { svg: squareFaviconSvg, size: 180, out: 'apple-touch-icon.png' },
    { svg: faviconSvg, size: 96, out: 'favicon-96.png' },
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(iconPage(svg, size))
    await page.screenshot({ path: join(publicDir, out), omitBackground: true })
    await page.close()
  }

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await og.setContent(ogPage)
  await og.screenshot({ path: join(publicDir, 'og-image.png') })
  await og.close()
} finally {
  await browser.close()
}

console.log('Wrote apple-touch-icon.png, favicon-96.png, og-image.png into public/')
