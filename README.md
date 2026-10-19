# Nectar Firefly

By **NECTAR VELINK** · package `com.nectarvelink.nectarfirefly` · Expo owner `899-903`.

A one-touch game for Android about fireflies, rhythm and a little science: bring a meadow of fireflies to flash as one.

**How it plays.**
- Swarms of fireflies drift in the long grass, each flashing to its own beat.
- Tap to show your lantern. The fireflies in its light flash at once. Tap just after another swarm flashes, and the lantern catches that beat: the swarm joins it.
- A flash nudges near neighbours on, so a swarm keeps itself together. Swarms far apart never hear each other.
- When the whole meadow flashes together three times running, the night is won. Dawn ends the night either way.
- Stars are fireflies: three for winning in par taps, two for a few more.

**Content.**
- 24 nights in three chapters:
  - **The Meadow:** still swarms.
  - **The Reeds:** swarms that drift by the pond, pulling each other in and out of step.
  - **Restless Nights:** wind that unsettles the swarms it crosses.
- Every night is generated and checked: left alone, the meadow never flashes as one. A watchful player, tapping a human 0.28 s after each flash, wins it with time to spare, and those taps are par.

**Look and sound.**
- Visuals:
  - A meadow under a crescent moon, a tree line and low mist, and a pond that mirrors the stars.
  - Tall grass in the foreground, and torn cloud on the restless nights.
  - Fireflies that bloom with light and wash the grass round them, and a warm paper lantern.
- Sound: there is almost no music, because the fireflies make it. Each swarm flashes on its own note of a pentatonic scale, so a meadow out of step twinkles and a meadow in step rings a chord. Under it are crickets, frogs, wind, the lantern's soft breath, and birds at dawn.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | The meadow: pulse-coupled oscillators (after Mirollo and Strogatz), the lantern, wind, unison, the watchful player |
| `web/src/game/nights.json` | The 24 generated nights |
| `web/tools/gen.ts` | The night generator |
| `web/src/game/scene.ts` | The Phaser meadow |
| `web/brand/` | Icon, splash and feature graphic |
| `Delivery/` | Play Store icon, feature graphic and screenshots |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 34 tests
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
