import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  actionForKey,
  normalizeKey,
} from './settings.ts'

const STORAGE_KEY = 'chess-editor-settings'

/** A minimal in-memory stand-in for the Web Storage API. */
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage())
})

describe('normalizeKey', () => {
  it('lowercases a single character and keeps named keys', () => {
    expect(normalizeKey('F')).toBe('f')
    expect(normalizeKey('r')).toBe('r')
    expect(normalizeKey('ArrowLeft')).toBe('ArrowLeft')
  })
})

describe('actionForKey', () => {
  it('finds the action bound to a key, or null', () => {
    const keys = DEFAULT_SETTINGS.keys
    expect(actionForKey(keys, 'ArrowLeft')).toBe('back')
    expect(actionForKey(keys, 'F')).toBe('flip')
    expect(actionForKey(keys, 'z')).toBeNull()
  })
})

describe('SettingsStore', () => {
  it('starts at the defaults when nothing is stored', () => {
    const store = new SettingsStore()
    expect(store.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('updates, persists, and notifies subscribers', () => {
    const store = new SettingsStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.update({ boardTheme: 'blue', depth: 18 })
    expect(store.get().boardTheme).toBe('blue')
    expect(store.get().depth).toBe(18)
    expect(listener).toHaveBeenCalledTimes(1)

    const reloaded = new SettingsStore()
    expect(reloaded.get().boardTheme).toBe('blue')
    expect(reloaded.get().depth).toBe(18)
  })

  it('normalizes a rebound key', () => {
    const store = new SettingsStore()
    store.setKey('flip', 'G')
    expect(store.get().keys.flip).toBe('g')
  })

  it('restores the defaults, including a customised key', () => {
    const store = new SettingsStore()
    store.setKey('reset', 'x')
    store.update({ sound: false })
    store.reset()
    expect(store.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('stops notifying after unsubscribe', () => {
    const store = new SettingsStore()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    store.update({ sound: false })
    off()
    store.update({ sound: true })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('merges a partial stored blob over the defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ boardTheme: 'brown' }))
    const store = new SettingsStore()
    expect(store.get().boardTheme).toBe('brown')
    expect(store.get().depth).toBe(DEFAULT_SETTINGS.depth)
    expect(store.get().keys).toEqual(DEFAULT_SETTINGS.keys)
  })

  it('clamps an out-of-range depth and volume', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ depth: 999, volume: 5 }))
    expect(new SettingsStore().get().depth).toBe(22)
    expect(new SettingsStore().get().volume).toBe(1)

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ depth: 1, volume: -3 }))
    expect(new SettingsStore().get().depth).toBe(6)
    expect(new SettingsStore().get().volume).toBe(0)
  })

  it('normalizes a stored key so a hand-edited uppercase still matches', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ keys: { flip: 'F' } }))
    expect(new SettingsStore().get().keys.flip).toBe('f')
  })

  it('rejects an invalid board theme and falls back to the default', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ boardTheme: 'rainbow' }))
    expect(new SettingsStore().get().boardTheme).toBe(DEFAULT_SETTINGS.boardTheme)
  })

  it('falls back to the defaults on a corrupt stored value', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(new SettingsStore().get()).toEqual(DEFAULT_SETTINGS)
  })
})
