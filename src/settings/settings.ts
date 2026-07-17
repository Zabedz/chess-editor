export type BoardTheme = 'green' | 'blue' | 'slate' | 'brown'
export type ShortcutAction = 'back' | 'forward' | 'flip' | 'reset'

export interface Settings {
  sound: boolean
  volume: number
  boardTheme: BoardTheme
  coordinates: boolean
  highlight: boolean
  depth: number
  keys: Record<ShortcutAction, string>
}

export const BOARD_THEMES: BoardTheme[] = ['green', 'blue', 'slate', 'brown']
export const SHORTCUT_ACTIONS: ShortcutAction[] = ['back', 'forward', 'flip', 'reset']

export const DEPTH_MIN = 6
export const DEPTH_MAX = 22

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  volume: 0.7,
  boardTheme: 'green',
  coordinates: true,
  highlight: true,
  depth: 15,
  keys: { back: 'ArrowLeft', forward: 'ArrowRight', flip: 'f', reset: 'r' },
}

const STORAGE_KEY = 'chess-editor-settings'

/** Folds an event key into the stored form: single characters are lowercased so
    Shift or Caps Lock does not create a second binding; named keys (ArrowLeft,
    Enter) are kept verbatim. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

/** Reports the action already bound to a key, if any, so a rebind can refuse a
    duplicate. */
export function actionForKey(keys: Settings['keys'], key: string): ShortcutAction | null {
  const normalized = normalizeKey(key)
  for (const action of SHORTCUT_ACTIONS) {
    if (keys[action] === normalized) return action
  }
  return null
}

type Listener = (settings: Settings) => void

/** Holds the user's preferences, persists them to localStorage, and notifies
    subscribers on every change so the board, engine, audio, and shortcuts stay
    in step with the panel. */
export class SettingsStore {
  private settings: Settings
  private readonly listeners = new Set<Listener>()

  constructor() {
    this.settings = load()
  }

  get(): Readonly<Settings> {
    return this.settings
  }

  update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    save(this.settings)
    for (const listener of this.listeners) listener(this.settings)
  }

  setKey(action: ShortcutAction, key: string): void {
    this.update({ keys: { ...this.settings.keys, [action]: normalizeKey(key) } })
  }

  reset(): void {
    this.update({ ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys } })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

function load(): Settings {
  const raw = readStorage()
  if (!raw) return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys } }
  try {
    return sanitize(JSON.parse(raw))
  } catch (error) {
    if (error instanceof SyntaxError) return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys } }
    throw error
  }
}

/** Merges stored values over the defaults and clamps them, so a partial or
    outdated saved blob still yields a complete, valid Settings. */
function sanitize(stored: unknown): Settings {
  const source = (stored ?? {}) as Partial<Settings>
  const keys = (source.keys ?? {}) as Partial<Settings['keys']>
  return {
    sound: typeof source.sound === 'boolean' ? source.sound : DEFAULT_SETTINGS.sound,
    volume: clampVolume(source.volume),
    boardTheme: BOARD_THEMES.includes(source.boardTheme as BoardTheme)
      ? (source.boardTheme as BoardTheme)
      : DEFAULT_SETTINGS.boardTheme,
    coordinates:
      typeof source.coordinates === 'boolean' ? source.coordinates : DEFAULT_SETTINGS.coordinates,
    highlight: typeof source.highlight === 'boolean' ? source.highlight : DEFAULT_SETTINGS.highlight,
    depth: clampDepth(source.depth),
    keys: {
      back: typeof keys.back === 'string' ? normalizeKey(keys.back) : DEFAULT_SETTINGS.keys.back,
      forward:
        typeof keys.forward === 'string' ? normalizeKey(keys.forward) : DEFAULT_SETTINGS.keys.forward,
      flip: typeof keys.flip === 'string' ? normalizeKey(keys.flip) : DEFAULT_SETTINGS.keys.flip,
      reset: typeof keys.reset === 'string' ? normalizeKey(keys.reset) : DEFAULT_SETTINGS.keys.reset,
    },
  }
}

function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SETTINGS.volume
  return Math.min(1, Math.max(0, value))
}

function clampDepth(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SETTINGS.depth
  return Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, Math.round(value)))
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function save(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // A blocked or full localStorage only costs persistence, so the settings
    // still apply for this session.
  }
}
