import type { Night } from './sim';
import DATA from './nights.json';

export type Level = Night & { id: string; name: string; chapter: number; hint?: string; par: number };
export const CHAPTERS = [
  { name: 'The Meadow', short: 'Meadow', blurb: 'Swarms of fireflies in the long grass, each flashing to its own beat. Bring them into step.' },
  { name: 'The Reeds', short: 'Reeds', blurb: 'By the pond the swarms drift as they flash, close for a while, then apart again.' },
  { name: 'Restless Nights', short: 'Restless', blurb: 'Wind crosses the meadow and unsettles the swarms it touches. Keep them together.' },
];
const IDS = [['m', 'The Meadow'], ['r', 'The Reeds'], ['w', 'Restless Nights']];
const NAMES = [
  ['First Glow', 'Long Grass', 'Clover', 'Haymaking', 'Foxgloves', 'Hedgerow', 'Midsummer', 'Harvest Night'],
  ['Still Water', 'Bulrushes', 'Lily Pads', 'Mayflies', 'Dragonfly', 'Willow', 'Heron', 'Moon on the Pond'],
  ['First Gust', 'Thistledown', 'Rustle', 'Barley', 'Windfall', 'Stormlight', 'Gale', 'The Long Night'],
];
const HINTS: Record<string, string> = {
  '0-0': 'Each swarm flashes to its own beat. Tap the second swarm just as the first one flashes, and they flash together.',
  '0-1': 'When the whole meadow flashes as one three times running, the night is won. Watch the lanterns at the top.',
  '1-0': 'By the pond the swarms drift. A swarm that drifts near another may pull it into step, or out of it.',
  '2-0': 'Wind unsettles the swarms it crosses. Bring them back into step before dawn.',
};
const D = DATA as unknown as Record<string, Night & { par: number }>;
/** Within each chapter, the nights in order of how many taps they take. */
export const LEVELS: Level[] = IDS.flatMap(([p], c) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: `${p}${i}`, ...D[`${p}${i}`] }))
    .sort((a, b) => a.par - b.par || a.flies.length - b.flies.length)
    .map((l, i) => ({ ...l, name: NAMES[c][i], chapter: c, hint: HINTS[`${c}-${i}`] })));
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
void IDS;
