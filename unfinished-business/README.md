# Unfinished Business

A portrait-first Canvas 2D ghost game inside GameBox. The current gameplay experiment uses **physical map pickups** for progression rather than tap-to-buy upgrades.

## Current gameplay loop

- Drag anywhere on the play area / use WASD or arrow keys to move.
- **There are no upgrade purchase buttons.** Speed, Vanish and Phase are upgraded by finding their icons in the level. Every pickup is free and lasts for the current run.
- Each level contains exactly enough permanent upgrade pickups to reach the current run maximum: **6 Speed**, **7 Vanish** and **7 Phase** pickups.
- **Speed pickups** are pale ghosts with rushing lines behind them. They immediately raise movement speed.
- **Phase pickups** are white ghosts that pulse between solid and translucent. They raise the Phase tier, but the next Phase tier cannot be collected until the preceding Unfinished Business task is complete.
- **Vanish pickups** are cool-blue shimmering ghosts. They unlock Vanish and increase its duration.
- **Golden ghosts are Scared Stiff only.** There are five per level (within the requested 4–6 range). They respawn after 35 seconds. The player can store at most three charges.
- When a witness would catch the player and a Scared Stiff charge is available, one charge is automatically consumed and that witness is frozen briefly.
- A Scared Stiff pickup is announced with its icon in the centre of the screen, then visually minimises into the persistent Scared Stiff inventory on the left side.
- Exploration still earns Echoes as a run score, but Echoes are no longer spent on upgrades.

## Five Unfinished Business tasks

Each level contains five task targets. They are rendered as **full-sized flashing multicoloured ghosts** rather than small markers.

1. Task 1 is reachable with no upgrades.
2. Task 2 is inside a sealed memory room requiring **Phase 1**.
3. Task 3 requires **Phase 2**.
4. Task 4 requires **Phase 3**.
5. Task 5 requires **Phase 4**.

Tasks are sequential. Completing the current task unlocks the next Phase hunt, so the player cannot stockpile later Phase tiers in advance. The intended rhythm is:

**finish task → find the newly available Phase pickup → enter the next room → finish the next task**

All five tasks must be completed before the level exit opens.

## Tutorial

The old Echo-purchase tutorial has been replaced. The new tutorial explains:

- upgrades are physical pickups rather than purchases;
- the Speed, Phase and Vanish icon treatments;
- Golden Ghost = Scared Stiff only;
- five Scared Stiff pickups per level, 35-second respawn and three-charge carrying limit;
- the five flashing multicoloured task ghosts;
- the Phase 1 → 4 room progression.

The new tutorial uses a separate one-time flag so existing players see the changed rules without losing campaign progress. The **How to Play** screen contains the same core rules for later reference.

## Run persistence

Getting caught or beginning another level resets the current run's Echoes, upgrade tiers, temporary effects, explored-ground rewards and Scared Stiff charges. Campaign level unlocks and basic records remain saved. The pre-change version is preserved on the branch:

`backup/unfinished-business-before-map-upgrades-2026-09-30`

## Art and implementation

The game remains self-contained and code-drawn. The player ghost, upgrade ghosts, task ghosts, witnesses, scenery, effects and UI are all produced with Canvas/CSS/SVG code; no external art downloads or APIs are required.

The task rooms are spectral memory seals layered into the existing maps. Their centres are selected from navigable ground reachable from the level spawn before the spectral Phase seal is applied.

## Checks

```
node --check unfinished-business/game.js
node --test unfinished-business/model.test.mjs unfinished-business/entities.test.mjs unfinished-business/world.test.mjs
```

The entities tests now cover the collectible counts, sequential Phase cap, maximum Speed/Vanish progression, Scared Stiff storage behaviour and 35-second respawn.
