import { defineConfig, type Plugin } from 'vite'

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
const base = process.env.BASE_PATH || '/'

// Absolute origin for the canonical link, Open Graph tags, sitemap, and
// structured data. The deploy workflow passes the Pages URL through SITE_URL
// (and later a custom domain, from the same Pages output), so those links track
// wherever the site is served. The default is the current project page so a
// local build still emits valid absolute URLs. A trailing slash is enforced so
// `${siteUrl}og-image.png` joins correctly.
const rawSiteUrl = process.env.SITE_URL || 'https://zabedz.github.io/chess-editor'
const siteUrl = rawSiteUrl.endsWith('/') ? rawSiteUrl : `${rawSiteUrl}/`

function robotsTxt(site: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`
}

function sitemapXml(site: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
}

// Resolves the `https://__SITE__/` placeholder in index.html to the site URL,
// and emits robots.txt and sitemap.xml carrying the same URL. The placeholder
// keeps the https:// prefix so Vite's own asset rewriting treats it as an
// external URL and leaves it for this hook to fill in.
function seoAssets(site: string): Plugin {
  return {
    name: 'seo-assets',
    transformIndexHtml(html) {
      return html.replaceAll('https://__SITE__/', site)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(site) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(site) })
    },
  }
}

export default defineConfig({
  base,
  plugins: [seoAssets(siteUrl)],
})
