/**
 * Firefly art, painted with Canvas 2D: a meadow at night under a crescent moon, a line of trees, grass in the
 * foreground; a pond with reeds that mirrors the sky; a restless violet night with torn cloud. Fireflies are a
 * dim body and a bloom of green-gold light; the lantern is warm paper light.
 */
import { H } from './sim';

export type Mood = { name: string; sky: [string, string, string]; ground: [string, string]; grass: [string, string]; fly: number; flyCss: string; water?: boolean; cloud: number };
export const MOODS: Mood[] = [
  { name: 'meadow', sky: ['#040a18', '#0b2034', '#1d3a44'], ground: ['#0b1f19', '#030907'], grass: ['#0e2a1e', '#020604'], fly: 0xd8ff7a, flyCss: '216,255,122', cloud: 0.15 },
  { name: 'reeds', sky: ['#03091a', '#0c1c3a', '#24384e'], ground: ['#0a1a22', '#02070a'], grass: ['#0b2224', '#010506'], fly: 0xb8ffb0, flyCss: '184,255,176', water: true, cloud: 0.2 },
  { name: 'wind', sky: ['#07051a', '#1c1238', '#3a2a4a'], ground: ['#120f1e', '#04030a'], grass: ['#1a1428', '#040208'], fly: 0xffe08a, flyCss: '255,224,138', cloud: 0.6 },
];
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d')! };
}
const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const TAU = Math.PI * 2;

/** The sky, the trees and the meadow (or the pond), VW×VH, with the meadow's units mapped by (ox, oy, k). */
export function backdrop(m: Mood, VW: number, VH: number, ox: number, oy: number, k: number, r: number, seed = 1) {
  const { c, g } = canvas(VW * r, VH * r);
  g.scale(r, r);
  const Y = (y: number) => oy + y * k, hz = Y(70);
  void ox;
  const sky = g.createLinearGradient(0, 0, 0, hz + 30); sky.addColorStop(0, m.sky[0]); sky.addColorStop(0.65, m.sky[1]); sky.addColorStop(1, m.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, VW, hz + 30);
  for (let i = 0; i < 220; i++) { const x = hash(i, seed) * VW, y = Math.pow(hash(i, seed + 1), 1.3) * hz, s = 0.3 + Math.pow(hash(i, seed + 2), 4) * 1.3; g.globalAlpha = 0.25 + hash(i, seed + 3) * 0.6; g.fillStyle = '#f4f2ff'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  // a crescent moon
  const mr = 11 * k, mx = VW * 0.8, my = Math.max(hz * 0.5, hz - 60 * k);
  const halo = g.createRadialGradient(mx, my, mr, mx, my, mr * 6); halo.addColorStop(0, 'rgba(220,235,255,0.22)'); halo.addColorStop(1, 'rgba(220,235,255,0)'); g.fillStyle = halo; g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
  // the crescent is cut on its own small canvas, so the cut never reaches the sky behind it
  const mc = canvas(mr * 2 + 4, mr * 2 + 4), mg = mc.g;
  mg.fillStyle = '#f6f3e4'; mg.beginPath(); mg.arc(mr + 2, mr + 2, mr, 0, TAU); mg.fill();
  mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(mr + 2 + mr * 0.45, mr + 2 - mr * 0.2, mr * 0.9, 0, TAU); mg.fill();
  g.drawImage(mc.c, mx - mr - 2, my - mr - 2);
  // torn cloud
  for (let i = 0; i < 6 + m.cloud * 10; i++) { const cx = hash(i, seed + 9) * VW, cy = hz * (0.2 + hash(i, seed + 10) * 0.65), w = VW * (0.2 + hash(i, seed + 11) * 0.35); const cg = g.createLinearGradient(0, cy - 8, 0, cy + 8); cg.addColorStop(0, `rgba(30,40,70,${0.25 + m.cloud * 0.4})`); cg.addColorStop(1, `rgba(90,100,140,${0.1 + m.cloud * 0.2})`); g.fillStyle = cg; g.beginPath(); g.ellipse(cx, cy, w / 2, 4 + hash(i, 12) * 7, 0, 0, TAU); g.fill(); }
  // the tree line
  g.fillStyle = '#02060a';
  g.beginPath(); g.moveTo(0, hz + 30);
  for (let x = 0; x <= VW; x += 4) { const h = 18 + Math.sin(x * 0.03 + seed) * 8 + Math.sin(x * 0.11) * 5 + (hash(Math.floor(x / 26), seed + 4) > 0.7 ? 14 * Math.sin(((x % 26) / 26) * Math.PI) : 0); g.lineTo(x, hz - h * k * 0.9 + 20); }
  g.lineTo(VW, hz + 30); g.closePath(); g.fill();
  // the meadow, or the pond
  const gr = g.createLinearGradient(0, hz + 10, 0, VH); gr.addColorStop(0, m.ground[0]); gr.addColorStop(1, m.ground[1]);
  g.fillStyle = gr; g.fillRect(0, hz + 10, VW, VH - hz);
  if (m.water) {
    const wy0 = Y(H * 0.55), wy1 = Y(H * 0.92);
    const wg = g.createLinearGradient(0, wy0, 0, wy1); wg.addColorStop(0, '#0e2236'); wg.addColorStop(1, '#030a12'); g.fillStyle = wg;
    g.beginPath(); g.ellipse(VW / 2, (wy0 + wy1) / 2, VW * 0.62, (wy1 - wy0) / 2, 0, 0, TAU); g.fill();
    // the stars again, rippled in the water
    g.save(); g.beginPath(); g.ellipse(VW / 2, (wy0 + wy1) / 2, VW * 0.62, (wy1 - wy0) / 2, 0, 0, TAU); g.clip();
    for (let i = 0; i < 90; i++) { const x = hash(i, seed + 30) * VW, y = wy0 + hash(i, seed + 31) * (wy1 - wy0); g.strokeStyle = `rgba(220,230,255,${0.1 + hash(i, 32) * 0.25})`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke(); }
    g.restore();
  }
  // a low mist over the meadow, and moonlight on it
  const mist = g.createLinearGradient(0, hz - 10, 0, hz + 90 * k); mist.addColorStop(0, 'rgba(170,200,210,0)'); mist.addColorStop(0.35, `rgba(170,200,210,${m.name === 'wind' ? 0.06 : 0.12})`); mist.addColorStop(1, 'rgba(170,200,210,0)');
  g.fillStyle = mist; g.fillRect(0, hz - 10, VW, 100 * k + 10);
  const moonlit = g.createRadialGradient(VW * 0.8, hz, 10, VW * 0.8, hz, VW * 0.9); moonlit.addColorStop(0, 'rgba(160,190,200,0.10)'); moonlit.addColorStop(1, 'rgba(160,190,200,0)');
  g.fillStyle = moonlit; g.fillRect(0, hz, VW, VH - hz);
  // tufts across the meadow, fainter far off
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(hash(i, seed + 40), 0.8), y = hz + 14 + t * (VH - hz - 14), x = hash(i, seed + 41) * VW, h = (3 + t * 14) * k, n = 3 + Math.floor(hash(i, 42) * 4);
    g.strokeStyle = `rgba(${m.name === 'wind' ? '60,50,90' : '40,80,60'},${0.15 + t * 0.35})`; g.lineWidth = 0.6 + t * 0.8;
    for (let j = 0; j < n; j++) { const lean = (hash(i * 7 + j, 43) - 0.5) * h * 0.6 + (m.name === 'wind' ? h * 0.3 : 0); g.beginPath(); g.moveTo(x + j * 1.5, y); g.quadraticCurveTo(x + j * 1.5 + lean * 0.3, y - h * 0.6, x + j * 1.5 + lean, y - h); g.stroke(); }
  }
  return c;
}
/** Tall grass and reeds in the foreground, over the fireflies: a dark fringe along the bottom. */
export function foreground(m: Mood, VW: number, VH: number, k: number, r: number, seed = 1) {
  const { c, g } = canvas(VW * r, VH * r);
  g.scale(r, r);
  for (let i = 0; i < 70; i++) {
    const x = hash(i, seed + 50) * VW, base = VH + 4, h = (40 + hash(i, seed + 51) * 90) * k, lean = (hash(i, seed + 52) - 0.4) * 40 * k + (m.name === 'wind' ? 18 * k : 0), w = (2 + hash(i, 53) * 3) * k;
    const gg = g.createLinearGradient(0, base - h, 0, base); gg.addColorStop(0, m.grass[0]); gg.addColorStop(1, m.grass[1]);
    g.fillStyle = gg; g.beginPath(); g.moveTo(x - w, base); g.quadraticCurveTo(x + lean * 0.3, base - h * 0.6, x + lean, base - h); g.quadraticCurveTo(x + lean * 0.3 + w * 0.4, base - h * 0.6, x + w, base); g.closePath(); g.fill();
    if (m.water && i % 5 === 0) { g.fillStyle = '#1a120a'; g.beginPath(); g.ellipse(x + lean, base - h, 2.4 * k, 9 * k, lean * 0.01, 0, TAU); g.fill(); }
  }
  return c;
}
/** A firefly's bloom: a soft round light, white at its heart. */
export function bloom(rad: number, rgb: string, r: number) {
  const S = rad * 2, { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const gr = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
  gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.08, `rgba(${rgb},0.95)`); gr.addColorStop(0.25, `rgba(${rgb},0.35)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return c;
}
/** A firefly's body, seen at night: a dim speck with wings. */
export function body(k: number, r: number) {
  const S = 8 * k, { c, g } = canvas(S * r, S * r);
  g.scale(r, r); g.translate(S / 2, S / 2); g.scale(0.75, 0.75);
  g.fillStyle = 'rgba(160,190,150,0.35)'; g.beginPath(); g.ellipse(-1.2 * k, -1 * k, 2 * k, 1 * k, -0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(1.2 * k, -1 * k, 2 * k, 1 * k, 0.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(120,150,90,0.8)'; g.beginPath(); g.ellipse(0, 0.5 * k, 1 * k, 1.8 * k, 0, 0, TAU); g.fill();
  return c;
}
