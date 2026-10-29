/**
 * Web Audio API sound service — procedurally generated, no file loading.
 *
 * Sound design:
 *  fire  — short ink-scratch (high pitched tap)
 *  fold  — whoosh sweep
 *  press — thud impact
 *  hit   — sharp punch
 *  miss  — soft dull thud
 *  kill  — BOOM explosion (deep rumble) + scream voice synth
 *  scream— distorted voice-like cry (for hit too)
 *  win   — triumphant fanfare
 *  lose  — sad descending
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

class AudioService {
  private ctx: AudioContext | null = null;
  private muted = false;
  private activePack: SoundPackId = "notebook";

  init(): void {
    if (this.ctx) return;
    try { this.ctx = new AudioContext(); } catch { /* unsupported */ }
  }

  setMuted(muted: boolean): void { this.muted = muted; }
  isMuted(): boolean { return this.muted; }
  setActivePack(pack: SoundPackId): void { this.activePack = pack; }

  play(sound: SoundId): void {
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();

    switch (sound) {
      case "fire":   this.playFire();   break;
      case "fold":   this.playFold();   break;
      case "press":  this.playPress();  break;
      case "hit":    this.playHit();    break;
      case "miss":   this.playMiss();   break;
      case "kill":   this.playKill();   break;
      case "win":    this.playWin();    break;
      case "lose":   this.playLose();   break;
    }
  }

  // ── Individual sound generators ────────────────────────────────────────────

  private playFire(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // Short scratch noise — paper being pressed
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.3, now);
    src.connect(g); g.connect(ctx.destination);
    src.start(now);
  }

  private playFold(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // Whoosh — sweep from high to low
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.35);
  }

  private playPress(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // Thud — short low sine burst
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.15);
  }

  private playHit(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // Impact punch + small scream
    this.playImpact(now, 0.4);
    this.playScream(now + 0.05, 0.5, 350); // brief yelp
  }

  private playMiss(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // Dull soft thud
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }

  private playKill(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    // BOOM explosion
    this.playBoom(now);
    // Scream — louder and longer than a hit
    this.playScream(now + 0.08, 0.8, 280);
  }

  private playWin(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.3, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  }

  private playLose(): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const notes = [392, 349, 294, 220];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      g.gain.setValueAtTime(0.25, now + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.4);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.4);
    });
  }

  // ── Reusable building blocks ───────────────────────────────────────────────

  /** Deep explosion boom */
  private playBoom(when: number): void {
    const ctx = this.ctx!;
    // Low sine punch
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, when);
    osc.frequency.exponentialRampToValueAtTime(25, when + 0.6);
    g.gain.setValueAtTime(0.9, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(when); osc.stop(when + 0.6);

    // Noise layer
    const dur = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < dur; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (dur * 0.3));
    const ns = ctx.createBufferSource();
    ns.buffer = buf;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.4, when);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
    ns.connect(lp); lp.connect(ng); ng.connect(ctx.destination);
    ns.start(when);
  }

  /** Voice-like scream using FM synthesis */
  private playScream(when: number, volume: number, baseFreq: number): void {
    const ctx = this.ctx!;
    const duration = 0.45;

    // Carrier
    const carrier = ctx.createOscillator();
    carrier.type = "sawtooth";
    carrier.frequency.setValueAtTime(baseFreq, when);
    carrier.frequency.setValueAtTime(baseFreq * 1.3, when + 0.05);
    carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, when + duration);

    // Modulator for vocal formant effect
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.setValueAtTime(baseFreq * 3.2, when);
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(baseFreq * 2, when);
    modGain.gain.exponentialRampToValueAtTime(10, when + duration);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    // Bandpass for nasal vocal quality
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(volume * 0.35, when);
    g.gain.setValueAtTime(volume * 0.35, when + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    carrier.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);

    mod.start(when); mod.stop(when + duration);
    carrier.start(when); carrier.stop(when + duration);
  }

  private playImpact(when: number, volume: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.12);
    g.gain.setValueAtTime(volume, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(when); osc.stop(when + 0.12);
  }
}

let _instance: AudioService = new AudioService();
export function getAudioService(): AudioService { return _instance; }
export function setAudioServiceForTest(mock: AudioService): void { _instance = mock as AudioService; }
export { AudioService };
