# Unfinished Business

A self-contained, portrait-first Canvas 2D ghost game. Open `unfinished-business/` through a static server; no build, external fonts, APIs or art downloads are required. GameBox links to it from the home menu.

## Play
- Drag anywhere on the play area / WASD / arrows: move. A floating joystick appears at the touch origin and disappears on release.
- Hold one of the three bottom ability buttons to activate it while moving with another finger. Locked buttons show their discovery requirement. Keyboard: 1–3 select; Space holds the selected skill.
- Speed is passive. Invisibility unlocks after the first completed attempt. Phase unlocks as you explore the house; Touch unlocks in the garage.
- Phase tiers unlock fabric, wood, plaster, brick, stone, metal, reinforced metal. Touch tiers unlock increasing resistance. Only one skill is active at once.
- Each previously unvisited 24×24 world cell awards exactly one Ghost Point. Visited cells persist across attempts and reloads, so the same ground never pays twice. Points bank immediately; the visited set and balance save together each second and on pause, capture, purchase and page exit. Existing upgrades and balances are retained.
- Pause freezes the simulation. Leaving the browser pauses automatically. Return home ends the current attempt.
- Reach the ferry to win. Replays remain available.

## Art and implementation
The reference-inspired ghost is drawn pixel by pixel in code, with directional eyes, scalloped hem, floating motion and separate shadow. Environment, characters, lighting and effects are procedural Canvas art; overlays and ability buttons use carved, stepped frames, inset surfaces and the same midnight/mint/aged-gold palette. Reduced motion disables bobbing. Audio is synthesized locally after interaction.

## Checks
`node --test unfinished-business/model.test.mjs`
`node --check unfinished-business/game.js`

The initial progression tuning is intentionally upgrade-driven. Physical phone testing should inform patrol timings, upgrade costs and thumb placement. This is a web game in GameBox, not a packaged app-store binary.

## Neighbourhood map

`world.js` defines a stable seeded 2D neighbourhood: four connected house rooms, a garage, gardens, shops, a park, churchyard, crossing and intersecting streets. Open loops and optional material shortcuts allow travel in all directions. Scenery is deterministically generated from the saved seed; resetting an attempt never rerolls exploration rewards. Humans and cats follow task loops with pauses and turns, using collision-aware navigation. The camera follows both axes.

Exploration bookkeeping is invisible: floor colours never depend on visited cells, no ground specks or +1 effects are drawn, and the minimap shows neither exploration history nor the exit. Scene rendering is culled to the camera. Exploration is device/browser local, like the existing save.

Tests cover unique-cell rewards, restart/reload persistence, save migration, stable generation, patrol clearance and reachable exploration funds before mandatory gates.

## Witnesses, investigations and secret pickups

- 18 humans have individual walking speeds and looping tasks, with pauses and turns. A local state machine handles routine, investigation, search, return and frozen states; no API or backend is used.
- Opening an obstacle with Touch alerts up to two nearby, reachable humans. Navigation rebuilds when a door opens. Humans walk to the disturbance, look around, then walk back to their interrupted routine. They do not teleport or pass through closed walls.
- Six sweeping CCTV cameras watch exterior corners and the bank interior. Camera sightings can end a run.
- Two black cats prowl. Their sightings never directly end a run; a cooldown-limited alert attracts one reachable human. Invisibility blocks all witness types.
- Twelve secret pickups are revealed only nearby with clear line of sight, never on the minimap. Fleet Spirit gives 1.65× movement for 10 seconds. Refills restore the unlocked invisibility capacity. Scared Stiff stores a charge: the next witness is frozen for 8 seconds, its sighting is ignored, and one charge is consumed. Another independent witness can still catch you.
- Pickups are once per attempt and reset for the next attempt. Temporary effects and collected charges are not permanent upgrades.

Run `node --test unfinished-business/model.test.mjs unfinished-business/entities.test.mjs` to check exploration, paths, loops, investigations, pickups and detection.
