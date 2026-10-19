/**
 * Night generator. Swarms of fireflies are scattered over the meadow, far enough apart that no flash carries from
 * one to another, each swarm at its own phase. A night is kept only if, left alone, the meadow never flashes as
 * one before dawn, while a watchful player wins it with time to spare. That player's taps become par.
 * Run: npx esbuild tools/gen.ts --bundle --platform=node --format=esm --outfile=tools/.gen.mjs && node tools/.gen.mjs
 */
import fs from 'node:fs';
import { H, NUDGE_R, playNight, W, type Fly, type Night } from '../src/game/sim';

type T = { id: string; swarms: [number, number]; size: [number, number]; spread: number; drift: number; wind: number; dawn: number; seed: number };
const t = (id: string, swarms: [number, number], size: [number, number], spread: number, drift: number, wind: number, dawn: number, seed: number): T => ({ id, swarms, size, spread, drift, wind, dawn, seed });
const TEMPLATES: T[] = [
  t('m1', [2, 2], [3, 4], 0.03, 0, 0, 80, 1), t('m2', [2, 3], [3, 5], 0.03, 0, 0, 80, 2), t('m3', [3, 3], [3, 5], 0.04, 0, 0, 80, 3), t('m4', [3, 4], [4, 6], 0.04, 0, 0, 80, 4),
  t('m5', [4, 4], [3, 6], 0.05, 0, 0, 80, 5), t('m6', [4, 5], [4, 6], 0.05, 0, 0, 85, 6), t('m7', [5, 5], [3, 6], 0.05, 0, 0, 85, 7), t('m8', [5, 6], [4, 7], 0.06, 0, 0, 90, 8),
  t('r1', [3, 3], [4, 5], 0.04, 1, 0, 80, 11), t('r2', [3, 4], [4, 6], 0.04, 1, 0, 80, 12), t('r3', [4, 4], [4, 6], 0.05, 1, 0, 85, 13), t('r4', [4, 5], [4, 6], 0.05, 1, 0, 85, 14),
  t('r5', [5, 5], [4, 6], 0.05, 1, 0, 85, 15), t('r6', [5, 6], [4, 6], 0.06, 1, 0, 90, 16), t('r7', [6, 6], [4, 6], 0.06, 1, 0, 90, 17), t('r8', [6, 7], [4, 6], 0.06, 1, 0, 95, 18),
  t('w1', [3, 4], [4, 6], 0.05, 0, 0.35, 85, 21), t('w2', [4, 4], [4, 6], 0.05, 0, 0.4, 85, 22), t('w3', [4, 5], [4, 6], 0.06, 1, 0.4, 90, 23), t('w4', [5, 5], [4, 6], 0.06, 0, 0.45, 90, 24),
  t('w5', [5, 6], [4, 6], 0.06, 1, 0.5, 90, 25), t('w6', [6, 6], [4, 6], 0.07, 0, 0.5, 95, 26), t('w7', [6, 6], [4, 6], 0.07, 1, 0.55, 100, 27), t('w8', [6, 7], [4, 6], 0.07, 1, 0.55, 110, 28),
];
function rng(seed: number) { let s = Math.imul(seed + 0x9e3779b9, 2654435761) >>> 0 || 1; for (let i = 0; i < 8; i++) { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; } return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const r2 = (v: number) => Math.round(v * 100) / 100;

function attempt(T: T, rnd: () => number): (Night & { par: number; winT: number }) | null {
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const ns = ri(...T.swarms), base = r2(1.7 + rnd() * 0.5);
  const centres: [number, number][] = [];
  for (let k = 0; k < ns; k++) {
    let ok = false;
    for (let a = 0; a < 80 && !ok; a++) {
      const c: [number, number] = [50 + rnd() * (W - 100), 90 + rnd() * (H - 200)];
      if (centres.some(([x, y]) => Math.hypot(x - c[0], y - c[1]) < NUDGE_R * 2.3 + 30)) continue;
      centres.push(c); ok = true;
    }
    if (!ok) return null;
  }
  const flies: Fly[] = [];
  centres.forEach(([cx, cy], k) => {
    const n = ri(...T.size), ph = rnd(), drift: [number, number, number] | undefined = T.drift ? [r2(14 + rnd() * 22), r2((0.05 + rnd() * 0.08) * (rnd() < 0.5 ? 1 : -1)), r2(rnd() * 6.28)] : undefined;
    for (let j = 0; j < n; j++) {
      const a = rnd() * 6.28, d = 6 + rnd() * 20;
      flies.push({ hx: Math.round(cx + Math.cos(a) * d), hy: Math.round(cy + Math.sin(a) * d * 0.8), a: r2(4 + rnd() * 7), f1: r2(0.3 + rnd() * 0.5), f2: r2(0.3 + rnd() * 0.5), p1: r2(rnd() * 6.28), p2: r2(rnd() * 6.28),
        period: r2(base * (1 + (rnd() - 0.5) * 2 * T.spread)), phase: r2((ph + (rnd() - 0.5) * 0.5 + 1) % 1), ...(drift ? { drift } : {}) });
    }
    void k;
  });
  const night: Night = { flies, dawn: T.dawn, ...(T.wind ? { wind: T.wind } : {}) };
  // alone, the meadow must not find its own way
  if (playNight(night, 'idle').won) return null;
  const b = playNight(night, 'bot');
  if (!b.won || b.t > T.dawn * 0.7) return null;
  if (b.taps < ns - 1) return null;
  return { ...night, par: b.taps, winT: Math.round(b.t) };
}

const only = process.argv[2] ? process.argv[2].split(',') : null;
const file = new URL('../src/game/nights.json', import.meta.url);
const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const T of TEMPLATES) {
  if (only && !only.includes(T.id)) continue;
  const rnd = rng(T.seed * 7919);
  let got = null, tries = 0;
  while (!got && tries < 3000) { tries++; got = attempt(T, rnd); }
  if (!got) { console.log(T.id, 'NONE'); continue; }
  const { winT, ...night } = got;
  out[T.id] = night;
  console.log(T.id, 'tries', tries, 'flies', night.flies.length, 'par', night.par, 'won at', winT, 's of', night.dawn);
}
fs.writeFileSync(file, JSON.stringify(out) + '\n');
