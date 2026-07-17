import {
  BOARD_THEMES,
  DEPTH_MAX,
  DEPTH_MIN,
  SHORTCUT_ACTIONS,
  actionForKey,
  type BoardTheme,
  type SettingsStore,
  type ShortcutAction,
} from '../settings/settings.ts'
import './settingsPanel.css'

const THEME_LABEL: Record<BoardTheme, string> = {
  green: 'Green',
  blue: 'Blue',
  slate: 'Slate',
  brown: 'Brown',
}

const ACTION_LABEL: Record<ShortcutAction, string> = {
  back: 'Undo (Back)',
  forward: 'Play best (Forward)',
  flip: 'Flip board',
  reset: 'Reset board',
}

// How long a shortcut-conflict note stays up.
const CONFLICT_NOTE_MS = 2600

/** The settings dialog. It reads the current values from the store, writes every
    change straight back, and captures a key press when rebinding a shortcut. */
export class SettingsPanel {
  private readonly store: SettingsStore
  private readonly dialog: HTMLDialogElement
  private readonly el: Record<string, HTMLElement> = {}
  private readonly swatches = new Map<BoardTheme, HTMLButtonElement>()
  private readonly keyCaps = new Map<ShortcutAction, HTMLElement>()
  private recording: ShortcutAction | null = null
  private noteTimer: ReturnType<typeof setTimeout> | undefined

  constructor(store: SettingsStore) {
    this.store = store
    this.dialog = document.createElement('dialog')
    this.dialog.className = 'settings-dialog'
    this.dialog.innerHTML = template()
    document.body.append(this.dialog)

    for (const node of this.dialog.querySelectorAll<HTMLElement>('[data-el]')) {
      this.el[node.dataset.el as string] = node
    }
    this.buildSwatches()
    this.buildShortcuts()
    this.wire()
    this.sync()
    store.subscribe(() => this.sync())
  }

  open(): void {
    this.sync()
    this.dialog.showModal()
  }

  isOpen(): boolean {
    return this.dialog.open
  }

  private wire(): void {
    for (const closer of ['close', 'done']) {
      this.el[closer].addEventListener('click', () => this.dialog.close())
    }
    // A click on the backdrop lands on the dialog element itself.
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
    this.dialog.addEventListener('close', () => this.stopRecording())

    this.el.sound.addEventListener('change', () => {
      this.store.update({ sound: (this.el.sound as HTMLInputElement).checked })
    })
    this.el.volume.addEventListener('input', () => {
      this.store.update({ volume: Number((this.el.volume as HTMLInputElement).value) / 100 })
    })
    this.el.coordinates.addEventListener('change', () => {
      this.store.update({ coordinates: (this.el.coordinates as HTMLInputElement).checked })
    })
    this.el.highlight.addEventListener('change', () => {
      this.store.update({ highlight: (this.el.highlight as HTMLInputElement).checked })
    })
    this.el.depth.addEventListener('input', () => {
      this.store.update({ depth: Number((this.el.depth as HTMLInputElement).value) })
    })
    this.el.restore.addEventListener('click', () => {
      this.stopRecording()
      this.store.reset()
    })

    // Capture phase so a rebind grabs the key before the dialog's Escape-to-close
    // and before the app's own shortcut handler.
    window.addEventListener('keydown', (event) => this.onRecordKey(event), true)
  }

  private buildSwatches(): void {
    for (const theme of BOARD_THEMES) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `theme-swatch theme-${theme}`
      button.setAttribute('aria-label', THEME_LABEL[theme])
      button.innerHTML = `<span class="theme-tile" aria-hidden="true"></span><span class="theme-name">${THEME_LABEL[theme]}</span>`
      button.addEventListener('click', () => this.store.update({ boardTheme: theme }))
      this.swatches.set(theme, button)
      this.el.swatches.append(button)
    }
  }

  private buildShortcuts(): void {
    for (const action of SHORTCUT_ACTIONS) {
      const row = document.createElement('div')
      row.className = 'keyrow'

      const label = document.createElement('span')
      label.className = 'keyrow-label'
      label.textContent = ACTION_LABEL[action]

      const right = document.createElement('span')
      right.className = 'keyrow-right'
      const cap = document.createElement('kbd')
      cap.className = 'keycap'
      const change = document.createElement('button')
      change.type = 'button'
      change.className = 'keyrow-change'
      change.textContent = 'Change'
      change.addEventListener('click', () => this.toggleRecording(action))

      right.append(cap, change)
      row.append(label, right)
      this.keyCaps.set(action, cap)
      this.el.shortcuts.append(row)
    }
  }

  private toggleRecording(action: ShortcutAction): void {
    if (this.recording === action) {
      this.stopRecording()
      return
    }
    this.stopRecording()
    this.recording = action
    this.keyCaps.get(action)?.parentElement?.parentElement?.classList.add('recording')
    const cap = this.keyCaps.get(action)
    if (cap) cap.textContent = 'press a key'
    this.setChangeLabel(action, 'Cancel')
  }

  private stopRecording(): void {
    if (!this.recording) return
    const action = this.recording
    this.recording = null
    this.keyCaps.get(action)?.parentElement?.parentElement?.classList.remove('recording')
    this.setChangeLabel(action, 'Change')
    this.sync()
  }

  private onRecordKey(event: KeyboardEvent): void {
    if (!this.recording) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.key === 'Escape') {
      this.stopRecording()
      return
    }
    // A lone modifier is not a usable shortcut; keep waiting for a real key.
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return

    const conflict = actionForKey(this.store.get().keys, event.key)
    if (conflict && conflict !== this.recording) {
      this.showConflict(conflict)
      return
    }
    this.store.setKey(this.recording, event.key)
    this.stopRecording()
  }

  private showConflict(action: ShortcutAction): void {
    clearTimeout(this.noteTimer)
    this.el.note.textContent = `That key already runs ${ACTION_LABEL[action]}. Pick another.`
    this.noteTimer = setTimeout(() => {
      this.el.note.textContent = ''
    }, CONFLICT_NOTE_MS)
  }

  private setChangeLabel(action: ShortcutAction, text: string): void {
    const change = this.keyCaps.get(action)?.nextElementSibling
    if (change) change.textContent = text
  }

  private sync(): void {
    const settings = this.store.get()
    ;(this.el.sound as HTMLInputElement).checked = settings.sound
    ;(this.el.volume as HTMLInputElement).value = String(Math.round(settings.volume * 100))
    this.el.volumeVal.textContent = `${Math.round(settings.volume * 100)}%`
    ;(this.el.coordinates as HTMLInputElement).checked = settings.coordinates
    ;(this.el.highlight as HTMLInputElement).checked = settings.highlight
    ;(this.el.depth as HTMLInputElement).value = String(settings.depth)
    this.el.depthVal.textContent = String(settings.depth)

    for (const [theme, button] of this.swatches) {
      button.classList.toggle('on', theme === settings.boardTheme)
      button.setAttribute('aria-pressed', String(theme === settings.boardTheme))
    }
    for (const [action, cap] of this.keyCaps) {
      if (this.recording !== action) cap.textContent = formatKey(settings.keys[action])
    }
  }
}

/** A key in reading form: named keys spelled out, single characters uppercased. */
function formatKey(key: string): string {
  const named: Record<string, string> = {
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ' ': 'Space',
    Enter: 'Enter',
  }
  return named[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

function template(): string {
  return `
    <div class="settings-card">
      <div class="settings-head">
        <h2 class="settings-title">
          <svg class="settings-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </h2>
        <button type="button" class="settings-x" data-el="close" aria-label="Close settings">&times;</button>
      </div>

      <div class="settings-body">
        <section class="settings-group">
          <p class="settings-group-title">Sound</p>
          <div class="settings-field">
            <span class="settings-label">Sound effects<span class="settings-sub">A click on moves and captures</span></span>
            <label class="toggle"><input type="checkbox" data-el="sound"><span class="toggle-track"></span><span class="toggle-thumb"></span></label>
          </div>
          <label class="settings-slider">
            <span class="slider-top"><span class="settings-label">Volume</span><span class="slider-val" data-el="volumeVal"></span></span>
            <input type="range" min="0" max="100" step="1" data-el="volume">
          </label>
        </section>

        <section class="settings-group">
          <p class="settings-group-title">Board</p>
          <div class="settings-field settings-field-top">
            <span class="settings-label">Board theme</span>
            <div class="theme-swatches" data-el="swatches"></div>
          </div>
          <div class="settings-field">
            <span class="settings-label">Show coordinates</span>
            <label class="toggle"><input type="checkbox" data-el="coordinates"><span class="toggle-track"></span><span class="toggle-thumb"></span></label>
          </div>
          <div class="settings-field">
            <span class="settings-label">Show move highlight<span class="settings-sub">The engine's from, to, and path squares</span></span>
            <label class="toggle"><input type="checkbox" data-el="highlight"><span class="toggle-track"></span><span class="toggle-thumb"></span></label>
          </div>
        </section>

        <section class="settings-group">
          <p class="settings-group-title">Engine</p>
          <label class="settings-slider">
            <span class="slider-top"><span class="settings-label">Search depth</span><span class="slider-val" data-el="depthVal"></span></span>
            <input type="range" min="${DEPTH_MIN}" max="${DEPTH_MAX}" step="1" data-el="depth">
            <span class="settings-sub settings-sub-block">Higher searches deeper: stronger moves, slower results.</span>
          </label>
        </section>

        <section class="settings-group">
          <p class="settings-group-title">Keyboard shortcuts</p>
          <div data-el="shortcuts"></div>
          <p class="shortcuts-note" data-el="note" role="status" aria-live="polite"></p>
        </section>
      </div>

      <div class="settings-foot">
        <button type="button" class="settings-restore" data-el="restore">Restore defaults</button>
        <button type="button" class="settings-done" data-el="done">Done</button>
      </div>
    </div>
  `
}
