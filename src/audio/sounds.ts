import type { Settings } from '../settings/settings.ts'

/** Synthesises short move and capture clicks with the Web Audio API, so the app
    ships no audio files. The context is created lazily on the first play, which
    happens inside a user gesture and so satisfies the browser autoplay policy. */
export class Sounds {
  private ctx: AudioContext | null = null
  private enabled: boolean
  private volume: number

  constructor(settings: Settings) {
    this.enabled = settings.sound
    this.volume = settings.volume
  }

  update(settings: Settings): void {
    this.enabled = settings.sound
    this.volume = settings.volume
  }

  move(): void {
    this.blip(660, 0.045)
  }

  capture(): void {
    this.blip(150, 0.09)
  }

  private blip(frequency: number, duration: number): void {
    if (!this.enabled || this.volume <= 0) return
    const ctx = this.context()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(frequency, now)
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, now + duration)

    const peak = this.volume * 0.28
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }

  private context(): AudioContext | null {
    if (!this.ctx) {
      if (!window.AudioContext) return null
      try {
        this.ctx = new AudioContext()
      } catch {
        // No audio device or a blocked context: return null so no sound plays.
        return null
      }
    }
    if (this.ctx.state === 'suspended') {
      // A context that cannot resume simply stays silent; there is nothing to
      // recover, so the rejected promise is left alone.
      void this.ctx.resume().catch(() => undefined)
    }
    return this.ctx
  }
}
