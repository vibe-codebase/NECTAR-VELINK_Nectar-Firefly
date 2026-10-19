# Nectar Firefly: design notes

## The idea
Some fireflies really do flash in unison, a whole river bank at once. They get there by nudging each other: each flash pulls neighbours a little closer to their own next flash. Firefly lets the player be the strongest neighbour of all.

## The meadow
- **Oscillators:** each firefly is an oscillator with its own period (a swarm's periods differ by a few percent). Its phase climbs from 0 to 1, and at 1 it flashes.
- **Coupling:** a flash pushes every firefly within 52 units on: φ ← φ(1 + 2ε) + ε/2. The push is bigger late in the cycle, which is what lets a swarm fall into step (Mirollo–Strogatz). One pushed past 1 flashes in the same instant, and the flashes cascade. Just after flashing, a firefly ignores its neighbours.
- **The lantern:** a tap lights a circle of 64 units.
  - If any other firefly flashed within the last 0.45 s, the lit fireflies take up that beat exactly.
  - Otherwise they flash at once.
  - This forgives a human's reaction time while still asking for rhythm.
- **Unison:** when every firefly has flashed within 0.25 s, that is a unison. Three in a row, each within one and a half periods of the last, wins the night.
- **Weather:** the reeds' swarms drift on slow circles. Wind is a gust crossing the meadow that speeds the fireflies it touches.
- **Determinism:** fixed steps at 60 Hz, no randomness at run time.

## Nights
Swarms are placed far enough apart that no flash carries between them, each at its own phase. A night is kept only if:
- the meadow left alone never wins;
- the watchful player wins before 70% of the way to dawn. That player taps 0.28 s after the leading swarm flashes, on the densest swarm not in step.

Its taps are par. Within each chapter the nights are ordered by par.

## Stars
Three at par, two within three taps, one for any win before dawn.
