# Unfinished Business

A self-contained, portrait-first Canvas 2D ghost game. Open `unfinished-business/` through a static server; no build, external fonts, APIs or art downloads are required. GameBox links to it from the home menu.

## Play
- Drag anywhere on the play area / WASD / arrows to move.
- Every attempt starts with a fresh ghost build. There is no persistent upgrade bank.
- Explore genuinely new ground during that attempt to build **Echoes**. Exploration pays in small chunks rather than a distracting +1 on every tile.
- Spend Echoes immediately from the live HUD. The separate gold `+` controls upgrade PACE, VANISH, PHASE and TOUCH without opening a shop or interrupting movement.
- The large ability buttons only use powers; the small gold controls only buy upgrades. This keeps activation and purchasing physically distinct on touch screens.
- VANISH, PHASE and TOUCH can all be unlocked from tier zero during a run. PACE is passive. Upgrade prices are deliberately low and ramp quickly enough that the first purchase should arrive early in a normal attempt.
- Hidden mystery tokens all use the same visual design. Their reward is unknown until collected: Echo bundles, temporary speed, an invisibility refill, or a Scared Stiff charge.
- More valuable caches are placed around interior and risky routes, giving stronger PHASE/TOUCH builds reasons to investigate doors, rooms and side paths.
- Getting caught or beginning another level resets Echoes, ability tiers, temporary effects and explored-ground rewards. Campaign level unlocks and basic records remain saved.
- Each higher campaign level begins with a slightly faster base movement pace so a full reset never feels artificially sluggish.
- Pause freezes the active run in memory. Leaving/reloading the page does not turn temporary run upgrades into permanent progression.

## Art and implementation
The reference-inspired ghost is drawn pixel by pixel in code, with directional eyes, scalloped hem, floating motion and separate shadow. Environment, characters, lighting and effects are procedural Canvas art; overlays and ability buttons use carved, stepped frames, inset surfaces and the same midnight/mint/aged-gold palette. Reduced motion disables bobbing. Audio is synthesized locally after interaction.

## Checks
`node --test unfinished-business/model.test.mjs`
`node --check unfinished-business/game.js`

The initial progression tuning is intentionally upgrade-driven. Physical phone testing should inform patrol timings, upgrade costs and thumb placement. This is a web game in GameBox, not a packaged app-store binary.

## Story and level structure

The campaign now presents five pieces of unfinished business in order: **The Graveyard**, **The Workplace**, **The Supermarket**, **The High Street**, and **Homeward**. Level 1 is no longer the old neighbourhood map: it is a dedicated cemetery with grave rows, memorial lawns, a chapel, funeral area, maintenance yard, hedges, paths and an iron exit gate.

The first launch runs a short animated pixel-art story sequence before asking whether the player wants the tutorial. The tutorial is optional and takes place safely inside the graveyard with witnesses disabled. It teaches movement, then awards Echoes one-by-one for new ground and walks the player through VANISH → PHASE → TOUCH in that order. Intro/tutorial completion is saved separately from temporary run progression.

Echoes are shown once, in the boxed top-left HUD. There is no second currency panel and no separate PACE purchase. The base ghost speed is intentionally quicker from the start, with a small automatic increase on later levels.

The minimap still shows neither exploration history nor the exit.

## Witnesses, investigations and secret pickups

- Human traffic is denser and faster. NPCs use destination-based routines such as commuting, shop deliveries, park visits, street cleaning, market running and returning from work instead of simply wandering nearby. Later levels add more humans, cats and cameras and increase patrol speed/range. A local state machine still handles routine, investigation, search, return and frozen states; no API or backend is used.
- Opening an obstacle with Touch alerts up to two nearby, reachable humans. Navigation rebuilds when a door opens. Humans walk to the disturbance, look around, then walk back to their interrupted routine. They do not teleport or pass through closed walls.
- Six sweeping CCTV cameras watch exterior corners and the bank interior. Camera sightings can end a run.
- Two black cats prowl. Their sightings never directly end a run; a cooldown-limited alert attracts one reachable human. Invisibility blocks all witness types.
- Sixteen mystery tokens are revealed only nearby with clear line of sight and never appear on the minimap. They all share one detailed pixel-art token design, so the player cannot identify the reward in advance.
- Token rewards cycle through 25/50 Echo caches, a 10-second speed surge, an invisibility refill and Scared Stiff. If a refill is found before VANISH is unlocked, it converts into Echoes rather than becoming a dead reward.
- Tokens are once per attempt and reset with the rest of the run. Temporary effects, Echoes and purchased tiers never become permanent upgrades.

Run `node --test unfinished-business/model.test.mjs unfinished-business/entities.test.mjs` to check exploration, paths, loops, investigations, pickups and detection.

## Scenery renderer

`scenery.js` paints a cached neighbourhood backdrop with deterministic timber, asphalt, grass, concrete and paving textures; room-specific tiles; patterned rugs; kerbs, crossings and drains; and soft ambient lighting. Detailed furniture, brickwork, foliage, vehicles, streetlamps and the ferry render on top. The background crop is drawn once per frame, rather than rebuilding its texture detail during play. All art is code-drawn; no external assets are downloaded. This renderer does not change map geometry, collisions, discovery records or entity behaviour.

## Directional character animation

`characters.js` draws humans and black cats in eight headings. Human silhouettes, faces, hair, clothing and limb placement change with facing; cats rotate their body, head, tail and four-paw gait. Walk cycles use distance travelled so animation speed follows movement and stops during pauses. Humans perform small note-checking, watch-checking and hand-work gestures while waiting; cats groom and flick their tails. Scared Stiff stops animation clocks. Reduced-motion mode suppresses idle motion and body bobbing. Detection continues to use the entity's actual angle; only rendering changes.
