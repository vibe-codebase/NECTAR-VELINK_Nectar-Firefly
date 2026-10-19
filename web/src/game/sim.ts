/**
 * Firefly's meadow. Every firefly is an oscillator: its phase climbs from 0 to 1 over its own period, and at 1 it
 * flashes. A flash nudges the phase of every firefly near it a little closer to its own next flash, and one pushed
 * past 1 flashes at once (pulse coupling, after Mirollo and Strogatz), so a close swarm falls into step by itself.
 * Swarms far apart never hear each other. The player's lantern is a stronger pulse: a tap makes every firefly in
 * its light flash at once. Tap one swarm just as another flashes and the two are in step. When the whole meadow
 * flashes together three times running before dawn, the night is won.
 * The meadow steps at a fixed rate with no randomness at run time, so a night plays the same every time.
 */
export const W = 360, H = 600;
export const DT = 1 / 60;
export const NUDGE_R = 52; // how far a flash carries
export const EPS = 0.06; // how much a neighbour's flash pushes a phase on
export const LANTERN_R = 64;
export const REFRACT = 0.18; // just after flashing, a firefly ignores its neighbours
export const UNISON = 0.25; // seconds: flashes within this window count as together
export const SNAP = 0.45; // a lantern shown this soon after a flash brings its fireflies into step with that flash
export const UNISONS_TO_WIN = 3;

export type Fly = { hx: number; hy: number; a: number; f1: number; f2: number; p1: number; p2: number; period: number; phase: number; drift?: [number, number, number] };
export type Night = { flies: Fly[]; dawn: number; wind?: number; need?: number };
export type Live = { x: number; y: number; phase: number; last: number; glow: number };
export type Run = { t: number; flies: Live[]; unisons: number; lastUnison: number; won: boolean; lost: boolean; taps: number };
export type Ev = { type: 'flash'; i: number } | { type: 'unison'; n: number } | { type: 'tap'; x: number; y: number; n: number } | { type: 'break' };

/** Where a firefly is at time t: wandering round its home, which itself may drift. */
export function where(f: Fly, t: number): [number, number] {
  let hx = f.hx, hy = f.hy;
  if (f.drift) { const [r, w, p] = f.drift; hx += Math.cos(t * w + p) * r; hy += Math.sin(t * w + p) * r * 0.7; }
  return [hx + Math.sin(t * f.f1 + f.p1) * f.a, hy + Math.sin(t * f.f2 + f.p2) * f.a * 0.6];
}
export function startRun(n: Night): Run {
  return { t: 0, unisons: 0, lastUnison: -99, won: false, lost: false, taps: 0, flies: n.flies.map((f) => { const [x, y] = where(f, 0); return { x, y, phase: f.phase, last: -99, glow: 0 }; }) };
}

/** One step. `tap` is where the lantern was shown this step, if it was. */
export function step(n: Night, r: Run, tap: [number, number] | null = null, ev: Ev[] = []) {
  if (r.won || r.lost) return;
  r.t += DT;
  const fl = r.flies, fired: number[] = [];
  n.flies.forEach((f, i) => {
    const L = fl[i], [x, y] = where(f, r.t);
    L.x = x; L.y = y;
    L.phase += DT / f.period;
    L.glow = Math.max(0, L.glow - DT * 2);
    if (L.phase >= 1) fired.push(i);
  });
  // wind, in the restless nights: a slow gust that unsettles the fireflies it crosses
  if (n.wind) {
    const gx = (((r.t * 23) % (W + 200)) - 100), gy = H * (0.3 + 0.4 * Math.sin(r.t * 0.13));
    if (Math.floor(r.t / 11) % 2 === 1) fl.forEach((L, i) => { if (Math.hypot(L.x - gx, (L.y - gy) * 0.6) < 70) L.phase += DT * n.wind! * (0.5 + 0.5 * Math.sin(i * 1.7)); });
  }
  if (tap) {
    r.taps++;
    const lit = fl.map((_, i) => i).filter((i) => Math.hypot(fl[i].x - tap[0], fl[i].y - tap[1]) < LANTERN_R && !fired.includes(i));
    // the most recent flash seen anywhere else: if it was just now, the lantern catches its beat
    let recent = -99;
    fl.forEach((L, i) => { if (!lit.includes(i)) recent = Math.max(recent, L.last); });
    const since = r.t - recent;
    if (since <= SNAP) lit.forEach((i) => { fl[i].phase = since / n.flies[i].period; fl[i].last = recent; fl[i].glow = Math.max(fl[i].glow, 0.75); });
    else fired.push(...lit);
    ev.push({ type: 'tap', x: tap[0], y: tap[1], n: lit.length });
  }
  // flashes cascade: each pushes its neighbours on, and any pushed past 1 flashes too
  const done = new Set<number>();
  while (fired.length) {
    const i = fired.pop()!;
    if (done.has(i)) continue;
    done.add(i);
    const L = fl[i]; L.phase = 0; L.last = r.t; L.glow = 1;
    ev.push({ type: 'flash', i });
    fl.forEach((M, j) => {
      if (j === i || done.has(j) || M.phase < REFRACT) return;
      if (Math.hypot(M.x - L.x, M.y - L.y) > NUDGE_R) return;
      // later in its cycle, a firefly is pushed further: this is what lets a swarm fall into step
      M.phase = M.phase * (1 + EPS * 2) + EPS / 2;
      if (M.phase >= 1) fired.push(j);
    });
  }
  // the whole meadow together?
  if (done.size) {
    let lo = Infinity, hi = -Infinity;
    for (const L of fl) { lo = Math.min(lo, L.last); hi = Math.max(hi, L.last); }
    if (hi - lo <= UNISON && r.t - r.lastUnison > UNISON * 2) {
      const maxP = Math.max(...n.flies.map((f) => f.period));
      r.unisons = r.t - r.lastUnison < maxP * 1.6 ? r.unisons + 1 : 1;
      r.lastUnison = r.t;
      ev.push({ type: 'unison', n: r.unisons });
      if (r.unisons >= (n.need ?? UNISONS_TO_WIN)) r.won = true;
    }
  }
  if (r.unisons > 0 && r.t - r.lastUnison > Math.max(...n.flies.map((f) => f.period)) * 1.6) { r.unisons = 0; ev.push({ type: 'break' }); }
  if (!r.won && r.t >= n.dawn) r.lost = true;
}

/** The commonest phase, and the fireflies near it: the swarm everyone should join. */
export function leaders(r: Run, tol = 0.05) {
  let best = 0, bp = 0;
  for (const L of r.flies) { let k = 0; for (const M of r.flies) { const d = Math.abs(L.phase - M.phase); if (Math.min(d, 1 - d) < tol) k++; } if (k > best) { best = k; bp = L.phase; } }
  return { phase: bp, count: best };
}
/** A watchful player: when the biggest swarm flashes, show the lantern to the densest group still out of step. */
export function botTap(n: Night, r: Run, justFlashed: boolean): [number, number] | null {
  if (!justFlashed) return null;
  const lead = leaders(r, 0.04);
  // the leaders have just flashed (phase near 0); everyone else is out of step
  const out = r.flies.filter((L) => { const d = Math.abs(L.phase - lead.phase); return Math.min(d, 1 - d) > 0.05; });
  if (!out.length) return null;
  let best: [number, number] | null = null, bk = 0;
  for (const c of out) {
    let k = 0, sx = 0, sy = 0;
    for (const M of out) if (Math.hypot(M.x - c.x, M.y - c.y) < LANTERN_R * 0.85) { k++; sx += M.x; sy += M.y; }
    if (k > bk) { bk = k; best = [sx / k, sy / k]; }
  }
  void n;
  return best;
}
/** Play a whole night: 'bot' (a watchful player), or 'idle' (no lantern at all). */
export function playNight(n: Night, who: 'bot' | 'idle', reaction = 0.28) {
  const r = startRun(n);
  let wait = 0, due = -1;
  while (!r.won && !r.lost) {
    const ev: Ev[] = [];
    let tap: [number, number] | null = null;
    if (who === 'bot') {
      // a person sees the leading swarm flash, and taps a moment later
      const lead = leaders(r, 0.04);
      if (due < 0 && wait <= 0 && lead.count >= 2 && lead.phase < DT / 1.2) due = r.t + reaction;
      if (due >= 0 && r.t >= due) {
        // tap the densest swarm that did not flash with the leaders
        const leadNow = leaders(r, 0.04);
        tap = botTap(n, { ...r, flies: r.flies.map((L) => ({ ...L, phase: (L.phase - leadNow.phase + 1) % 1 })) }, true);
        due = -1; if (tap) wait = 0.5;
      }
    }
    wait -= DT;
    step(n, r, tap, ev);
  }
  return r;
}
export function starsFor(taps: number, par: number) { return taps <= par ? 3 : taps <= par + 3 ? 2 : 1; }
