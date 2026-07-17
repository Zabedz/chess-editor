const STORAGE_KEY = 'theme'

type Theme = 'light' | 'dark'

function preferred(): Theme {
  const chosen = document.documentElement.getAttribute('data-theme')
  if (chosen === 'light' || chosen === 'dark') return chosen
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Wires a header button that switches between light and dark and remembers the
    choice. With no stored choice the app follows the OS preference. */
export function wireTheme(button: HTMLButtonElement): void {
  const label = (): void => {
    const next: Theme = preferred() === 'dark' ? 'light' : 'dark'
    button.textContent = next === 'dark' ? 'Dark' : 'Light'
    button.setAttribute('aria-label', `Switch to ${next} theme`)
  }

  const stored = readStored()
  if (stored) document.documentElement.setAttribute('data-theme', stored)
  label()

  // Keep the label right if the OS theme changes while no manual choice is set.
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!document.documentElement.getAttribute('data-theme')) label()
  })

  button.addEventListener('click', () => {
    const next: Theme = preferred() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    writeStored(next)
    label()
  })
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    // Storage can be unavailable (private mode); fall back to the OS theme.
    return null
  }
}

function writeStored(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable; the choice just will not persist.
  }
}
