import { useEffect, useRef } from 'react';
import { backdrop, canvas, MOODS } from '../game/art';
import type { Level } from '../game/levels';
import { W, where } from '../game/sim';

const cache = new Map<string, HTMLCanvasElement>();
/** The night in miniature: the meadow and its swarms, dim; once won, every firefly lit. */
function paintCard(level: Level, solved: boolean, w: number, h: number, dpr: number) {
  const m = MOODS[level.chapter], { c, g } = canvas(w * dpr, h * dpr);
  g.scale(dpr, dpr);
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 8); g.clip();
  const k = Math.min(w / W, h / 520), ox = (w - W * k) / 2, oy = (h - 520 * k) / 2 - 20 * k;
  g.drawImage(backdrop(m, w, h, ox, oy, k, dpr, 5), 0, 0, w, h);
  for (const f of level.flies) {
    const [x, y] = where(f, 0), sx = ox + x * k, sy = oy + y * k;
    if (solved) { const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 6); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.3, `rgba(${m.flyCss},0.6)`); gr.addColorStop(1, `rgba(${m.flyCss},0)`); g.fillStyle = gr; g.fillRect(sx - 6, sy - 6, 12, 12); }
    else { g.fillStyle = `rgba(${m.flyCss},0.55)`; g.beginPath(); g.arc(sx, sy, 0.9, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  return c;
}

export function Postcard({ level, solved, locked, width }: { level: Level; solved: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.5);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), key = `${level.id}|${solved}|${locked}|${width}|${dpr}`;
    let src = cache.get(key);
    if (!src) { src = paintCard(level, solved && !locked, width, height, dpr); cache.set(key, src); }
    el.width = src.width; el.height = src.height; el.getContext('2d')!.drawImage(src, 0, 0);
  }, [level, solved, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
