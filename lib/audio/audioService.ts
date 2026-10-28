/**
 * Web Audio API sound service.
 * - Lazy-initialized on first user gesture
 * - Procedurally generated sounds (no file loading needed for placeholders)
 * - Mockable in tests via the exported singleton getter
 */
import type { SoundPackId } from "../themes/types";

export type SoundId =
  | "fire"
  | "fold"
  | "press"
  | "hit"
  | "miss"
  | "kill"
  | "win"
  | "lose";

interface SoundDef {
  frequency: number;
  type: OscillatorType;
  duration: number;     // seconds
  gainStart: number;
  gainEnd: number;
  detune?: number;
}

const SOUND_DEFS: Record<SoundId, SoundDef> = {
  fire:  { frequency: 440, type: "sine",    duration: 0.08, gainStart: 0.3, gainEnd: 0.0 },
  fold:  { frequency: 220, type: "sawtooth",duration: 0.3,  gainStart: 0.2, gainEnd: 0.0 },
  press: { frequency: 80,  type: "sine",    duration: 0.12, gainStart: 0.5, gainEnd: 0.0 },
  hit:   { frequency: 300, type: "square",  duration: 0.15, gainStart: 0.4, gainEnd: 0.0 },
  miss:  { frequency: 180, type: "sine",    duration: 0.1,  gainStart: 0.2, gainEnd: 0.0 },
  kill:  { frequency: 150, type: "sawtooth",duration: 0.4,  gainStart: 0.6, gainEnd: 0.0, detune: -200 },
  win:   { frequency: 520, type: "sine",    duration: 0.6,  gainStart: 0.5, gainEnd: 0.0, detune: 400 },
  lose:  { frequency: 200, type: "sawtooth",duration: 0.5,  gainStart: 0.4, gainEnd: 0.0, detune: -400 },
};

class AudioService {
  private ctx: AudioContext | null = null;
  private muted = false;
  private activePack: SoundPackId = "notebook";

  /** Must be called after a user gesture before any sound plays. */
  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      // AudioContext not supported
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setActivePack(pack: SoundPackId): void {
    this.activePack = pack;
  }

  play(sound: SoundId): void {
    if (this.muted || !this.ctx) return;

    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    const def = SOUND_DEFS[sound];
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = def.type;
    osc.frequency.setValueAtTime(def.frequency, now);
    if (def.detune) osc.detune.setValueAtTime(def.detune, now);

    gain.gain.setValueAtTime(def.gainStart, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + def.duration);

    osc.start(now);
    osc.stop(now + def.duration);
  }
}

// Singleton — swap this in tests with a mock
let _instance: AudioService = new AudioService();

export function getAudioService(): AudioService {
  return _instance;
}

/** For testing only — replace the singleton with a mock. */
export function setAudioServiceForTest(mock: AudioService): void {
  _instance = mock;
}

export { AudioService };
