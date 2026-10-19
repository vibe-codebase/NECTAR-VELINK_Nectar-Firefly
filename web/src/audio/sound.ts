/**
 * Firefly sound, synthesised with Web Audio. There is almost no music: the fireflies make it. Every flash is a
 * soft glass note, each swarm on its own note of a pentatonic scale, so a meadow out of step twinkles at random
 * and a meadow in step rings a chord. Under it: crickets, frogs by the pond, wind on the restless nights, a low
 * pad, the lantern's warm breath, and at dawn the first birds.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const ROOTS = [392, 349.23, 329.63];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private seed = 3;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private wind: GainNode | null = null;
  private recent = 0; private recentT = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(4);
      const wet = ctx.createGain(); wet.gain.value = 0.45;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      const w = ctx.createBufferSource(); w.buffer = this.noise; w.loop = true; w.playbackRate.value = 0.4;
      const wl = ctx.createBiquadFilter(); wl.type = 'bandpass'; wl.frequency.value = 500; wl.Q.value = 0.5;
      this.wind = ctx.createGain(); this.wind.gain.value = 0;
      w.connect(wl).connect(this.wind).connect(this.music); w.start();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.6 * (this.ducked ? 0.7 : 1), t, 0.3);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }
  weather(wind: number) { if (this.ctx && this.wind) this.wind.gain.setTargetAtTime(wind * 0.04, this.ctx.currentTime, 1); }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  /** The night itself: crickets chirping in threes, frogs by the pond, and a low pad that changes every few bars. */
  private schedule() {
    const ctx = this.ctx!;
    const step = 0.25, root = ROOTS[this.chapter % 3] / 4;
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next, pos = this.beatN % 32;
      if (pos === 0) [0, 7, 16].forEach((n) => this.pad(t, semis(root, n + (Math.floor(this.beatN / 32) % 2 ? 5 : 0)), 8.5));
      if (this.rnd() < 0.18) this.cricket(t, 4200 + this.rnd() * 900);
      if (this.chapter === 1 && this.rnd() < 0.03) this.frog(t);
      this.next += step; this.beatN++;
    }
  }
  private pad(t: number, f: number, dur: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(this.music); o.start(t); o.stop(t + dur + 0.1);
  }
  private cricket(t: number, f: number) {
    const ctx = this.ctx!;
    for (let k = 0; k < 3; k++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; const s = t + k * 0.05; g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.004, s + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.03); o.connect(g).connect(this.music); o.start(s); o.stop(s + 0.04); }
  }
  private frog(t: number) { const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(140, t + 0.18); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(lp).connect(g).connect(this.music); o.start(t); o.stop(t + 0.25); }
  private note(t: number, f: number, vol: number, dur = 1.4) {
    const ctx = this.ctx!;
    [[1, 1], [2.01, 0.25], [3.98, 0.08]].forEach(([m, v]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / m); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.05); });
  }
  /** A firefly flashes: its swarm's note, quieter when many flash at once so a chord never gets loud. */
  flash(i: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t - this.recentT > 0.12) { this.recent = 0; this.recentT = t; }
    this.recent++;
    if (this.recent > 8) return;
    this.note(t + Math.random() * 0.01, semis(ROOTS[this.chapter % 3], PENTA[i % PENTA.length]), 0.02 / Math.sqrt(this.recent), 1.6);
  }
  lantern() { if (!this.ctx) return; const t = this.ctx.currentTime, ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1400, t + 0.15); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); src.connect(lp).connect(g).connect(this.sfx); src.start(t); src.stop(t + 0.45); }
  /** The meadow flashes together: a chord that grows with each unison. */
  unison(n: number) { if (!this.ctx) return; const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] / 2; [0, 4, 7, 12, 16].slice(0, 2 + n).forEach((d, k) => this.note(t + k * 0.03, semis(root, d), 0.03, 3)); }
  tap() { if (this.ctx) this.note(this.ctx.currentTime, 1568, 0.012, 0.5); }
  /** Dawn: the first birds. */
  birds() { if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime; for (let k = 0; k < 4; k++) { const o = ctx.createOscillator(), g = ctx.createGain(), s = t + k * 0.14; o.frequency.setValueAtTime(2600 + k * 200, s); o.frequency.exponentialRampToValueAtTime(3600, s + 0.08); g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.01, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.1); o.connect(g).connect(this.sfx); o.start(s); o.stop(s + 0.12); } }
  win(stars: number) { if (!this.ctx) return; const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3]; [0, 4, 7, 12, 16, 19].slice(0, 3 + stars).forEach((d, k) => this.note(t + k * 0.12, semis(root, d), 0.035, 3)); }
  fail() { if (!this.ctx) return; const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] / 2; this.note(t, semis(root, 4), 0.03, 2); this.note(t + 0.3, root, 0.03, 2.5); }
  star(i: number) { if (this.ctx) this.note(this.ctx.currentTime, semis(ROOTS[this.chapter % 3] * 2, [0, 4, 7][i] ?? 7), 0.04, 1.6); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    return b;
  }
}
export const sound = new Sound();
