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

`world.js` defines a stable seeded 2D neighbourhood: four connected house rooms, a garage, gardens, shops, a park, churchyard, crossing and intersecting streets. Open loops and optional material shortcuts allow travel in all directions. Scenery is deterministically generated from the saved seed; resetting an attempt never rerolls exploration rewards. Patrols move along clear horizontal and vertical segments. The camera follows both axes.

Unvisited ground has faint gold specks; discoveries flash +1 and appear in mint on the compact map. The ferry is marked gold. Scene rendering is culled to the camera. Exploration is device/browser local, like the existing save.

Tests cover unique-cell rewards, restart/reload persistence, save migration, stable generation, patrol clearance and reachable exploration funds before mandatory gates.
