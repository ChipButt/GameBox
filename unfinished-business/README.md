# Unfinished Business

Portrait-first Canvas 2D ghost game inside GameBox.

## Current gameplay

- Drag anywhere on the play area, or use WASD / arrow keys, to move.
- There are no ability or upgrade buttons.
- Speed and Phase are passive upgrades collected in the world.
- **Speed** tokens immediately increase movement speed.
- **Phase** tokens increase the player's Phase tier. If the tier is high enough for a wall, door, gate or sealed task room, walking into it automatically triggers the Phase visual and passes through it.
- **Vanish is not part of the current game.**
- Gold **Scared Stiff** ghosts protect the player from a witness who would otherwise catch them. Five appear per level, respawn after 35 seconds and up to three charges can be carried.
- Main levels contain **6 Speed**, **7 Phase** and **5 Scared Stiff** pickups.
- Each level contains five flashing multicolour Unfinished Business ghosts. The first needs no Phase upgrade; the next four require Phase 1, 2, 3 and 4.
- Completing all five tasks opens the exit.

## Mausoleum introduction

The old tutorial screens are removed.

The first time the player begins Level 1, they enter a small playable mausoleum before the Graveyard. It contains one example of each current pickup:

- Speed — “Collect Speed tokens to move faster!”
- Phase — “Collect Phase tokens to pass through stronger walls!”
- Scared Stiff — “Collect Scared Stiff tokens to freeze anyone who spots you!”

A Phase-I stone seal lets the player experience automatic Phase traversal directly. Once all three tokens are collected, the mausoleum door opens and the Graveyard begins with a fresh run.

## Visual direction

The menu and mausoleum use code-drawn pixel artwork. The menu includes a pixel cemetery/mausoleum scene and hard pixel-style frames/buttons rather than smooth rounded UI.

The minimap uses terrain/material fills, physical structures, Phase seals, distinct pickup glyphs, animated task markers and a directional ghost marker. The level exit is intentionally not shown on the minimap.

## Checks

```
node --check unfinished-business/game.js
node --check unfinished-business/entities.js
node --test unfinished-business/world.test.mjs
node --test unfinished-business/model.test.mjs unfinished-business/entities.test.mjs
```

The previous build is preserved on `backup/unfinished-business-before-mausoleum-intro-2026-09-30`.
