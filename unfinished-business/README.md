# Unfinished Business

A self-contained, portrait-first Canvas 2D ghost game. Open `unfinished-business/` through a static server; no build, external fonts, APIs or art downloads are required. GameBox links to it from the home menu.

## Play
- Left thumbstick / WASD / arrows: move.
- Hold Skill / Space: use selected skill. The attached selector or keys 1–3 switch skills.
- Speed is passive. Invisibility unlocks after the first completed attempt. Phase unlocks before the house curtain; Touch unlocks in the garage.
- Phase tiers unlock fabric, wood, plaster, brick, stone, metal, reinforced metal. Touch tiers unlock increasing resistance. Only one skill is active at once.
- All runs bank furthest forward distance; retracing steps does not generate more points. Upgrade purchases and discoveries persist in localStorage on this browser/device.
- Pause freezes the simulation. Leaving the browser pauses automatically. Bank & return ends the current attempt.
- Reach the ferry to win. Replays remain available.

## Art and implementation
The reference-inspired ghost is drawn pixel by pixel in code, with directional eyes, scalloped hem, floating motion and separate shadow. Environment, characters, lighting and effects are procedural Canvas art; overlays use the same midnight/mint/aged-gold palette. Reduced motion disables bobbing. Audio is synthesized locally after interaction.

## Checks
`node --test unfinished-business/model.test.mjs`
`node --check unfinished-business/game.js`

The initial progression tuning is intentionally upgrade-driven. Physical phone testing should inform patrol timings, upgrade costs and thumb placement. This is a web game in GameBox, not a packaged app-store binary.
