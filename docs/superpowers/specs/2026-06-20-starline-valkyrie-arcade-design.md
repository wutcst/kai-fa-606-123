# Starline Valkyrie Arcade Design

## Goal

Create a polished horizontal arcade shooter that is immediately fun: move, auto-fire, melt enemy waves, chain combos, collect power, and fight bosses without menu-heavy progression.

## Game Feel

- Player ship stays on the left half of the screen and moves with WASD or arrow keys.
- Weapons fire automatically. Space triggers a screen-clearing surge when charged.
- Enemies stream from the right with dense but readable movement.
- Kills create score, combo, explosions, shards, and power drops.
- Power drops increase firepower temporarily and stack into a “hot” state.
- A boss appears on a timed cadence and fills the screen with obvious attacks.

## Visual Direction

Use procedural Canvas sprites instead of external images. This avoids asset licensing issues and keeps ships, bullets, explosions, and UI in one neon sci-fi style.

## Completion Criteria

- Local game opens from `index.html` through a simple dev server.
- The first screen is the game, not a landing page.
- Player can move, auto-fire, kill enemies, collect powerups, use bomb, fight boss, pause, restart, and see score/health/combo.
- Core rules have automated tests.
- Browser render is verified with a screenshot or equivalent runtime check.
