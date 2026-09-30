# Unfinished Business

Portrait-first Canvas 2D ghost game inside GameBox.

## Gameplay

- Drag anywhere on the play area, or use WASD / arrow keys, to move.
- Speed, Vanish and Phase are upgraded by collecting their ghost icons.
- Upgrade pickups are always collectible when found.
- Each level contains 6 Speed, 7 Vanish and 7 Phase pickups.
- Speed pickups have rushing lines.
- Phase pickups fade between solid and translucent.
- Vanish pickups use a cool-blue shimmer.
- Five gold Scared Stiff ghosts appear per level. They respawn after 35 seconds and the player can carry up to 3 charges.
- Scared Stiff automatically freezes a witness that would otherwise catch the player.
- Scared Stiff collection is announced in the centre, then minimises into the left-side inventory.
- There are no Echoes or exploration currency.

## Unfinished Business

Each level has five flashing multicolour task ghosts.

- Task 1 requires no Phase upgrade.
- Task 2 requires Phase 1.
- Task 3 requires Phase 2.
- Task 4 requires Phase 3.
- Task 5 requires Phase 4.

The Phase requirement is enforced by the sealed task room itself. Players may collect any upgrades they find at any time.

Completing all five tasks opens the exit.

## Tutorial

The first-run tutorial is visual and concise: movement, Speed, Phase, Vanish, Scared Stiff and the five Unfinished Business targets.

## Checks

```
node --check unfinished-business/game.js
node --check unfinished-business/entities.js
node --test unfinished-business/world.test.mjs
node --test unfinished-business/model.test.mjs unfinished-business/entities.test.mjs
```

The pre-change pickup build is preserved on `backup/unfinished-business-before-echo-removal-2026-09-30`.
