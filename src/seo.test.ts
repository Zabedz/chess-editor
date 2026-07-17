import htmlRaw from '../index.html?raw'
import { describe, expect, it } from 'vitest'

// The visible FAQ and the FAQPage structured data in index.html are two
// separate copies kept in sync, and Google needs them identical for the rich
// result to stay valid. This asserts every JSON-LD question and answer appears
// in the page's visible text, with <script> and <style> stripped so the JSON-LD
// cannot match itself. Editing one copy but not the other then fails the suite.

interface FaqQuestion {
  name: string
  acceptedAnswer: { text: string }
}

interface FaqPage {
  '@type': string
  mainEntity: FaqQuestion[]
}

function faqStructuredData(html: string): FaqPage {
  const blocks = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  for (const [, body] of blocks) {
    const data = JSON.parse(body) as { '@type': string }
    if (data['@type'] === 'FAQPage') return data as FaqPage
  }
  throw new Error('index.html has no FAQPage JSON-LD block')
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

describe('FAQ structured data matches the visible FAQ', () => {
  const faq = faqStructuredData(htmlRaw)
  const visible = visibleText(htmlRaw)

  it('has at least one entry', () => {
    expect(faq.mainEntity.length).toBeGreaterThan(0)
  })

  for (const entry of faq.mainEntity) {
    it(`shows "${entry.name}"`, () => {
      expect(visible).toContain(entry.name)
      expect(visible).toContain(entry.acceptedAnswer.text)
    })
  }
})
