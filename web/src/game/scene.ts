import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, type Level } from './levels';
import { botTap, DT, leaders, LANTERN_R, startRun, starsFor, step, UNISONS_TO_WIN, W as SW, type Ev, type Run } from './sim';
import { sound } from '../audio/sound';

export type Result = { won: boolean; taps: number; par: number; stars: number; time: number };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type HudState = { phase: 'play' | 'done'; taps: number; par: number; unisons: number; need: number; dawn: number; msg: string; msgId: number };

/** Bridge between React and the Phaser scene. */
export const meadow = {
  hooks: {} as Hooks,
  scene: null as FireflyScene | null,
  reducedMotion: false,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  debug() { return this.scene?.debugState(); },
  /** QA only: the leading swarm's phase, and where a watchful player would tap now (CSS pixels). */
  qaLead() { return this.scene?.qaLead(); },
};
(window as unknown as { __firefly: typeof meadow }).__firefly = meadow;

const VIEW_W = 360;
const SHOWCASE = ['m8', 'r6', 'w5', 'r8', 'm7'];
type FlyView = { body: Phaser.GameObjects.Image; bloom: Phaser.GameObjects.Image; wash: Phaser.GameObjects.Image };

export class FireflyScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  run!: Run;
  private mode: 'menu' | 'play' = 'menu';
  private phase: 'play' | 'done' = 'play';
  private paused = false;
  private acted = false;
  private texSeq = 0;
  private r = 2;
  private viewW = VIEW_W; private viewH = 700;
  private k = 1; private ox = 0; private oy = 0;
  private acc = 0;
  private pending: [number, number] | null = null;
  private lastTap = -9;
  private clock = 0;
  private msg = ''; private msgId = 0;
  private flies: FlyView[] = [];
  private ripples: { x: number; y: number; t: number; n: number }[] = [];
  private unisonFlash = 0;
  private fx!: Phaser.GameObjects.Graphics;
  private dawnRect!: Phaser.GameObjects.Image;
  private botDue = -1; private botWait = 0;
  private birdsSung = false;
  /** QA only: let the watchful player keep a night in play mode, for screenshots on slow machines. */
  autoplay = false;

  constructor() { super('firefly'); }

  create() {
    meadow.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tap(p));
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0]) ?? LEVELS[0]);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; }
  hudState(): HudState { const r = this.run; return { phase: this.phase, taps: r.taps, par: this.level.par, unisons: r.unisons, need: this.level.need ?? UNISONS_TO_WIN, dawn: Math.min(1, r.t / this.level.dawn), msg: this.msg, msgId: this.msgId }; }
  debugState() { const r = this.run; return { ...this.hudState(), mode: this.mode, t: Math.round(r.t * 10) / 10, won: r.won, lost: r.lost, lit: r.flies.filter((L) => L.glow > 0.6).length }; }
  private css(x: number, y: number) { const [sx, sy] = this.S(x, y), z = this.cameras.main.zoom, kk = (this.game.canvas.clientWidth || VIEW_W) / this.scale.width; return { x: sx * z * kk, y: sy * z * kk }; }
  qaLead() {
    const r = this.run, lead = leaders(r, 0.04);
    const shifted = { ...r, flies: r.flies.map((L) => ({ ...L, phase: (L.phase - lead.phase + 1) % 1 })) };
    const t = botTap(this.level, shifted, true);
    return { phase: lead.phase, count: lead.count, period: this.level.flies[0].period, t: r.t, target: t ? this.css(t[0], t[1]) : null, done: this.phase === 'done' };
  }
  private say(m: string) { this.msg = m; this.msgId++; }

  /** A timer that only fires if the scene has not been shown anew since: a finished demo must never bring the menu back over a new game. */
  private gen = 0;
  private later(ms: number, fn: () => void) { const g = this.gen; this.time.delayedCall(ms, () => { if (g === this.gen) fn(); }); }
  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode; this.level = level;
    this.gen++;
    this.paused = false; this.acted = false; this.phase = 'play';
    this.run = startRun(level);
    this.acc = 0; this.pending = null; this.msg = ''; this.ripples = []; this.unisonFlash = 0; this.botDue = -1; this.botWait = 0; this.birdsSung = false;
    this.rebuild();
    sound.weather(level.wind ?? 0);
  }

  // ── layout ────────────────────────────────────────────────────────────
  private tex(prefix: string, c: HTMLCanvasElement) { const key = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(key, c); return key; }
  private S(x: number, y: number): [number, number] { return [this.ox + x * this.k, this.oy + y * this.k]; }
  private U(sx: number, sy: number): [number, number] { return [(sx - this.ox) / this.k, (sy - this.oy) / this.k]; }
  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    const pw = this.scale.width, ph = this.scale.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    const zoom = Math.min(pw / VIEW_W, ph / 640);
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewW = pw / zoom; this.viewH = ph / zoom;
    this.cameras.main.setZoom(zoom).centerOn(this.viewW / 2, this.viewH / 2);
    const css = zoom / dpr, play = this.mode === 'play', top = (play ? 64 : 200) / css, bottom = (play ? 90 : 200) / css;
    const W = this.viewW, H = this.viewH, m = A.MOODS[this.level.chapter], r = this.r, br = Math.min(r, 1.5);
    // the meadow's swarms live between y 70 and 520; fit that between the HUD bars
    // a band of sky below the HUD, then the meadow, where the swarms live between y 70 and 520
    const sky = (play ? 56 : 30) / css;
    this.k = Math.min(W / SW, (H - top - bottom - sky) / 450);
    const spare = Math.max(0, H - top - bottom - sky - 450 * this.k);
    this.ox = (W - SW * this.k) / 2; this.oy = top + sky + spare * 0.4 - 70 * this.k;
    this.add.image(0, 0, this.tex('bg', A.backdrop(m, W, H, this.ox, this.oy, this.k, br, 5 + LEVELS.indexOf(this.level)))).setOrigin(0, 0).setScale(1 / br);
    // dawn: a warm wash that rises over the sky as the night runs out
    const dw = A.canvas(4, 256); const dg = dw.g.createLinearGradient(0, 0, 0, 256); dg.addColorStop(0, 'rgba(255,190,140,0.65)'); dg.addColorStop(0.45, 'rgba(255,170,150,0.25)'); dg.addColorStop(1, 'rgba(255,170,150,0)'); dw.g.fillStyle = dg; dw.g.fillRect(0, 0, 4, 256);
    this.dawnRect = this.add.image(0, 0, this.tex('dawn', dw.c)).setOrigin(0, 0).setDisplaySize(W, H).setAlpha(0).setDepth(1);
    const bodyKey = this.tex('body', A.body(this.k, r)), bloomKey = this.tex('bloom', A.bloom(26 * this.k, m.flyCss, r)), washKey = this.tex('wash', A.bloom(70 * this.k, m.flyCss, Math.min(r, 1)));
    this.flies = this.level.flies.map(() => ({
      wash: this.add.image(0, 0, washKey).setScale(1 / Math.min(r, 1)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(2),
      body: this.add.image(0, 0, bodyKey).setScale(1 / r).setDepth(3),
      bloom: this.add.image(0, 0, bloomKey).setScale(1 / r).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(4),
    }));
    this.fx = this.add.graphics().setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(0, 0, this.tex('fg', A.foreground(m, W, H, this.k, br, 7))).setOrigin(0, 0).setScale(1 / br).setDepth(6);
  }

  // ── the lantern ───────────────────────────────────────────────────────
  private tap(p: Phaser.Input.Pointer) {
    if (this.mode !== 'play' || this.paused || this.phase !== 'play') return;
    if (this.clock - this.lastTap < 0.12) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y), [x, y] = this.U(w.x, w.y);
    if (!this.acted) { this.acted = true; meadow.hooks.onFirstAction?.(); }
    this.pending = [x, y]; this.lastTap = this.clock;
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.clock += dt;
    const r = this.run, l = this.level;
    if (!this.paused && this.phase === 'play') {
      this.acc += this.autoplay ? Math.min(0.5, dms / 1000) : dt;
      const evs: Ev[] = [];
      let n = 0;
      while (this.acc >= DT && n < (this.autoplay ? 40 : 6) && this.phase === 'play') {
        this.acc -= DT; n++;
        let tap = this.pending; this.pending = null;
        if (this.mode === 'menu' || this.autoplay) tap = this.demoTap() ?? tap;
        step(l, r, tap, evs);
        if (r.won || r.lost) this.finish();
      }
      for (const e of evs) this.event(e);
      if (this.mode === 'play' && !this.birdsSung && r.t > l.dawn - 12) { this.birdsSung = true; sound.birds(); this.say('The sky is growing light.'); }
    }
    this.draw(dt);
  }
  /** The attract mode keeps its own watchful player. */
  private demoTap(): [number, number] | null {
    const r = this.run, lead = leaders(r, 0.04);
    this.botWait -= DT;
    if (this.botDue < 0 && this.botWait <= 0 && lead.count >= 2 && lead.phase < DT / 1.2) this.botDue = r.t + 0.28;
    if (this.botDue >= 0 && r.t >= this.botDue) {
      this.botDue = -1;
      const shifted = { ...r, flies: r.flies.map((L) => ({ ...L, phase: (L.phase - lead.phase + 1) % 1 })) };
      const t = botTap(this.level, shifted, true);
      if (t) { this.botWait = 0.5; return t; }
    }
    return null;
  }
  private event(e: Ev) {
    if (e.type === 'flash') sound.flash(this.swarmOf(e.i));
    else if (e.type === 'tap') { this.ripples.push({ x: e.x, y: e.y, t: 0, n: e.n }); if (this.mode === 'play' && !this.autoplay) { sound.lantern(); meadow.hooks.onHaptic?.('light'); } }
    else if (e.type === 'unison') { this.unisonFlash = 1; sound.unison(e.n); if (this.mode === 'play') { meadow.hooks.onHaptic?.('medium'); if (e.n < (this.level.need ?? UNISONS_TO_WIN)) this.say(e.n === 1 ? 'The whole meadow, together.' : 'Again, together.'); } }
    else if (e.type === 'break' && this.mode === 'play') this.say('Out of step again.');
  }
  /** Swarms are numbered by where they sit, so each sounds its own note. */
  private swarmOf(i: number) { const f = this.level.flies[i]; return Math.floor(f.hx / 72) + Math.floor(f.hy / 120) * 5; }
  private finish() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    const r = this.run, won = r.won, st = won ? starsFor(r.taps, this.level.par) : 0;
    if (this.mode === 'play') {
      if (won) { sound.win(st); meadow.hooks.onHaptic?.('success'); } else sound.fail();
      this.later(won ? 2200 : 1400, () => meadow.hooks.onFinish?.({ level: this.level, result: { won, taps: r.taps, par: this.level.par, stars: st, time: Math.round(r.t) } }));
    } else this.later(3000, () => { const i = (SHOWCASE.indexOf(this.level.id) + 1) % SHOWCASE.length; this.show('menu', LEVELS.find((x) => x.id === SHOWCASE[i]) ?? LEVELS[0]); });
  }
  private reduced() { return meadow.reducedMotion; }
  private draw(dt: number) {
    const r = this.run, k = this.k, fx = this.fx;
    fx.clear();
    r.flies.forEach((L, i) => {
      const v = this.flies[i], [x, y] = this.S(L.x, L.y), g = L.glow, gg = g * g;
      v.body.setPosition(x, y).setAlpha(0.28 + 0.3 * (1 - g));
      v.bloom.setPosition(x, y).setAlpha(Math.min(1, g * 1.15)).setScale((0.55 + 0.6 * g) / this.r);
      v.wash.setPosition(x, y).setAlpha(gg * 0.16);
    });
    // the lantern's light spreads where it was shown
    this.ripples = this.ripples.filter((p) => (p.t += dt) < 0.9);
    for (const p of this.ripples) {
      const [x, y] = this.S(p.x, p.y), e = p.t / 0.9, R = LANTERN_R * k * (0.35 + 0.65 * Math.sqrt(e));
      fx.fillStyle(0xffc878, 0.2 * (1 - e)); fx.fillCircle(x, y, R);
      fx.lineStyle(1.6, 0xffd99a, 0.7 * (1 - e)); fx.strokeCircle(x, y, R);
      fx.fillStyle(0xfff0c8, 0.6 * (1 - e)); fx.fillCircle(x, y, 4 * k * (1 - e) + 1);
    }
    // the whole meadow lights as one
    this.unisonFlash = Math.max(0, this.unisonFlash - dt * 1.6);
    if (this.unisonFlash > 0 && !this.reduced()) { fx.fillStyle(A.MOODS[this.level.chapter].fly, 0.08 * this.unisonFlash); fx.fillRect(0, 0, this.viewW, this.viewH); }
    // wind: drifting streaks where the gust crosses
    if (this.level.wind && !this.reduced() && Math.floor(r.t / 11) % 2 === 1) {
      const gx = (((r.t * 23) % (SW + 200)) - 100), gy = 600 * (0.3 + 0.4 * Math.sin(r.t * 0.13));
      for (let j = 0; j < 14; j++) { const a = (j * 47.3 + r.t * 60) % 140 - 70, b = ((j * 31.7) % 80) - 40, [x, y] = this.S(gx + a, gy + b); fx.lineStyle(0.8, 0xc8d0ff, 0.12); fx.lineBetween(x, y, x + 14 * k, y - 1 * k); }
    }
    const d = Math.min(1, r.t / this.level.dawn);
    this.dawnRect.setAlpha(Math.max(0, (d - 0.55) / 0.45) * 0.9);
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#06110f',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 2 },
    scene: [FireflyScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
