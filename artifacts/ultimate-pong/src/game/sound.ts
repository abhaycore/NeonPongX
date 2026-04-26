/**
 * Lightweight Web Audio sound engine. Generates tones procedurally; no assets.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure() {
    if (this.ctx) return;
    try {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  private beep(freq: number, durationMs: number, type: OscillatorType = "square", gain = 1) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0;
    const now = ctx.currentTime;
    const dur = durationMs / 1000;
    g.gain.linearRampToValueAtTime(0.7 * gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  paddleHit() { this.beep(480, 60, "square"); }
  wallHit() { this.beep(280, 50, "triangle", 0.7); }
  score() {
    this.beep(660, 80);
    setTimeout(() => this.beep(880, 80), 70);
    setTimeout(() => this.beep(1175, 140), 150);
  }
  powerUpSpawn() { this.beep(660, 60, "sine"); setTimeout(() => this.beep(990, 80, "sine"), 50); }
  powerUpCollect() { this.beep(1047, 80, "sine"); setTimeout(() => this.beep(1568, 100, "sine"), 70); }
  matchPoint() { this.beep(660, 200, "sawtooth", 0.5); }
  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.beep(n, 180, "square"), i * 140));
  }
  defeat() {
    const notes = [523, 415, 349, 262];
    notes.forEach((n, i) => setTimeout(() => this.beep(n, 220, "sawtooth", 0.6), i * 180));
  }
  menuMove() { this.beep(440, 25, "square", 0.4); }
  menuSelect() { this.beep(880, 60, "square"); }
}

export const sound = new SoundEngine();
