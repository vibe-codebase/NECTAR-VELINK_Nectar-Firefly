// Store icon, adaptive-icon layers, splash and feature graphic: a paper lantern in the night grass, and fireflies.
import * as A from '../src/game/art';

const M = A.MOODS[0];
const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function night(g: CanvasRenderingContext2D, W: number, H: number, horizon: number) {
  const k = W / 360, b = A.backdrop(M, W, H, 0, horizon - 70 * k, k, 1, 4);
  g.drawImage(b, 0, 0);
}
/** A glowing firefly at (x, y), r across. */
function fly(g: CanvasRenderingContext2D, x: number, y: number, r: number, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,240,${a})`); gr.addColorStop(0.1, `rgba(${M.flyCss},${0.95 * a})`); gr.addColorStop(0.3, `rgba(${M.flyCss},${0.32 * a})`); gr.addColorStop(1, `rgba(${M.flyCss},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
/** A swarm: n fireflies round (cx, cy). */
function swarm(g: CanvasRenderingContext2D, cx: number, cy: number, spread: number, n: number, r: number, seed: number) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const a = hash(i, seed) * 6.28, d = Math.sqrt(hash(i, seed + 1)) * spread; fly(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, r * (0.6 + hash(i, seed + 2) * 0.6), 0.6 + hash(i, seed + 3) * 0.4); }
  g.restore();
}
/** A paper lantern, warm-lit, s tall, its centre at (x, y). */
function lantern(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const glow = g.createRadialGradient(x, y, 0, x, y, s * 2.4); glow.addColorStop(0, 'rgba(255,200,120,0.55)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = glow; g.fillRect(x - s * 2.4, y - s * 2.4, s * 4.8, s * 4.8);
  const w = s * 0.62, h = s * 0.5;
  const body = g.createRadialGradient(x - w * 0.2, y - h * 0.2, 1, x, y, w); body.addColorStop(0, '#fff6dc'); body.addColorStop(0.5, '#ffc870'); body.addColorStop(1, '#d0742a');
  g.fillStyle = body; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(140,60,20,0.45)'; g.lineWidth = s * 0.02;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(x, y, w * Math.abs(i) / 3.4, h, 0, 0, Math.PI * 2); g.stroke(); }
  for (const yy of [y - h * 0.95, y + h * 0.95]) { g.fillStyle = '#3a2412'; g.beginPath(); g.roundRect(x - w * 0.45, yy - s * 0.05, w * 0.9, s * 0.1, s * 0.02); g.fill(); }
  g.strokeStyle = '#2a1a0c'; g.lineWidth = s * 0.025; g.beginPath(); g.moveTo(x, y - h - s * 0.05); g.lineTo(x, y - h - s * 0.5); g.stroke();
}
export function icon() {
  const { c, g } = A.canvas(1024, 1024);
  night(g, 1024, 1024, 330);
  lantern(g, 512, 590, 330);
  swarm(g, 300, 380, 120, 9, 46, 1); swarm(g, 760, 420, 110, 8, 46, 2); swarm(g, 640, 860, 120, 6, 40, 3); swarm(g, 250, 830, 90, 5, 40, 4);
  g.drawImage(A.foreground(M, 1024, 1024, 2.6, 1, 3), 0, 0);
  return c;
}
export function adaptive() { const { c, g } = A.canvas(1024, 1024); lantern(g, 512, 560, 260); g.save(); g.globalCompositeOperation = 'lighter'; swarm(g, 360, 390, 80, 7, 36, 1); swarm(g, 680, 420, 80, 6, 36, 2); swarm(g, 560, 760, 70, 5, 32, 3); g.restore(); return c; }
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); night(g, 1024, 1024, 330); return c; }
export function splash() {
  const W = 1284, H = 2778, { c, g } = A.canvas(W, H);
  night(g, W, H, 1100);
  swarm(g, 360, 1400, 160, 12, 50, 1); swarm(g, 920, 1520, 150, 10, 50, 2); swarm(g, 640, 1900, 180, 12, 50, 3);
  lantern(g, W / 2, 2250, 300);
  g.drawImage(A.foreground(M, W, H, 3.2, 1, 3), 0, 0);
  g.textAlign = 'center'; g.font = 'italic 600 220px Lora, serif';
  const tg = g.createLinearGradient(0, 520, 0, 760); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.55, '#d8ff7a'); tg.addColorStop(1, '#7aa83a');
  g.shadowColor = 'rgba(200,255,120,0.4)'; g.shadowBlur = 50; g.fillStyle = tg; g.fillText('Firefly', W / 2, 700); g.shadowBlur = 0;
  g.save(); g.shadowBlur = 0; g.font = '600 58px "Nunito Sans", sans-serif'; g.fillStyle = '#d8ff7a'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('NECTAR', W / 2 + 17, 500); g.restore();
  return c;
}
/** The feature graphic: the whole meadow flashing as one over the grass, the lantern to one side, the words in the sky. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  night(g, W, H, 220);
  swarm(g, 560, 300, 90, 10, 30, 11); swarm(g, 760, 260, 80, 9, 30, 12); swarm(g, 900, 360, 90, 9, 30, 13); swarm(g, 660, 420, 80, 8, 28, 14); swarm(g, 460, 400, 60, 6, 26, 15);
  // a pale bloom over the whole meadow: they are flashing together
  const all = g.createRadialGradient(720, 330, 10, 720, 330, 420); all.addColorStop(0, 'rgba(216,255,122,0.18)'); all.addColorStop(1, 'rgba(216,255,122,0)'); g.fillStyle = all; g.fillRect(0, 0, W, H);
  lantern(g, 330, 400, 110);
  g.drawImage(A.foreground(M, W, H, 1.4, 1, 3), 0, 0);
  g.textAlign = 'left';
  const tg = g.createLinearGradient(0, 70, 0, 160); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.55, '#d8ff7a'); tg.addColorStop(1, '#8ab84a');
  g.save(); g.shadowBlur = 0; g.font = '600 22px "Nunito Sans", sans-serif'; g.fillStyle = '#d8ff7a'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('NECTAR', 64, 72); g.restore();
  g.shadowColor = 'rgba(200,255,120,0.35)'; g.shadowBlur = 26; g.fillStyle = tg; g.font = 'italic 600 92px Lora, serif'; g.fillText('Firefly', 60, 150); g.shadowBlur = 0;
  g.fillStyle = '#f2f4e8'; g.font = 'italic 500 30px Lora, serif'; g.fillText('One meadow. One light.', 64, 200);
  g.fillStyle = '#d8ff7a'; g.fillRect(66, 222, 48, 2);
  g.fillStyle = 'rgba(242,244,232,0.82)'; g.font = '600 18px "Nunito Sans", sans-serif';
  g.fillText('Tap your lantern in time and bring scattered', 66, 258);
  g.fillText('swarms of fireflies to flash as one. 24 nights.', 66, 284);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
