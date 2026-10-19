import { describe, expect, it } from 'vitest';
import { DT, LANTERN_R, playNight, startRun, starsFor, step, NUDGE_R, type Night } from './sim';
import { CHAPTERS, LEVELS, levelIndex } from './levels';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

describe('nights', () => {
  it('has 24 nights in three chapters of eight, with unique ids and names', () => {
    expect(LEVELS).toHaveLength(24);
    expect(CHAPTERS).toHaveLength(3);
    for (let c = 0; c < 3; c++) expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(24);
    expect(levelIndex(LEVELS[8].id)).toBe(8);
  });
  it('chapters bring drifting swarms, then wind', () => {
    expect(LEVELS.filter((l) => l.chapter === 0).every((l) => !l.wind && l.flies.every((f) => !f.drift))).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 1).every((l) => l.flies.every((f) => f.drift))).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 2).every((l) => (l.wind ?? 0) > 0)).toBe(true);
  });
  it('par rises through each chapter', () => {
    for (let c = 0; c < 3; c++) { const p = LEVELS.filter((l) => l.chapter === c).map((l) => l.par); for (let i = 1; i < 8; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]); }
  });
});

describe('every night', () => {
  for (const l of LEVELS) {
    it(`${l.id} ${l.name}: left alone it never flashes as one; a watchful player wins it in par taps`, () => {
      expect(playNight(l, 'idle').won).toBe(false);
      const b = playNight(l, 'bot');
      expect(b.won).toBe(true);
      expect(b.taps).toBe(l.par);
      expect(b.t).toBeLessThan(l.dawn * 0.7);
    });
  }
});

describe('fireflies', () => {
  const two = (gap: number): Night => ({ dawn: 60, flies: [0, 1].map((i) => ({ hx: 100 + i * gap, hy: 200, a: 0, f1: 0, f2: 0, p1: 0, p2: 0, period: 2, phase: i ? 0.5 : 0.1 })) });
  it('neighbours fall into step on their own', () => {
    const r = playNight(two(30), 'idle');
    expect(r.won).toBe(true);
  });
  it('swarms out of reach do not', () => {
    expect(playNight(two(NUDGE_R * 2), 'idle').won).toBe(false);
  });
  it('a tap makes the fireflies in the lantern flash, and a tap just after a flash catches its beat', () => {
    const n = two(NUDGE_R * 3), r = startRun(n);
    // wait for the first to flash, then show the lantern to the second a moment later
    let k = 0;
    while (r.flies[0].last < 0) { step(n, r); k++; }
    for (let j = 0; j < 12; j++) step(n, r);
    step(n, r, [r.flies[1].x, r.flies[1].y]);
    expect(Math.abs(r.flies[1].last - r.flies[0].last)).toBeLessThan(DT * 2);
    expect(r.taps).toBe(1);
    void k; void LANTERN_R;
  });
  it('plays the same every time', () => {
    const l = LEVELS[20], a = playNight(l, 'bot'), b = playNight(l, 'bot');
    expect(a.t).toBe(b.t); expect(a.taps).toBe(b.taps);
  });
});

describe('stars and save', () => {
  it('stars follow par', () => { expect(starsFor(4, 4)).toBe(3); expect(starsFor(7, 4)).toBe(2); expect(starsFor(8, 4)).toBe(1); });
  it('records the fewest taps and unlocks the next night', () => {
    let s = freshSave();
    expect(isUnlocked(s, 1)).toBe(false);
    s = recordResult(s, LEVELS[0].id, 2, 5); s = recordResult(s, LEVELS[0].id, 1, 7);
    expect(s.stars[LEVELS[0].id]).toBe(2); expect(s.best[LEVELS[0].id]).toBe(5); expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(2);
  });
  it('parses corrupt saves safely', () => { expect(parseSave('nope')).toEqual(freshSave()); });
});
