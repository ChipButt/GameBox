# Ancient Dominion

A playable, touch-first real-time strategy skirmish inspired by the feel of late-1990s PC RTS games. It is **not** an official Age of Empires port and uses no original Age of Empires code, sprites, audio or branding.

## Play

Open **https://chipbutt.github.io/GameBox/ancient-dominion/** in a mobile or desktop browser.

## Controls

- **Tap blue units/buildings** to select.
- **Tap resources after selecting a villager** to gather food, wood, stone or gold.
- **Drag** to pan; **pinch** or use **+ / −** to zoom.
- **Select a villager → Build → Choose a building → Tap open ground** to construct a house, barracks, tower, farm or granary.
- **Select the Village Centre** to train villagers or advance to Bronze/Iron Age.
- **Select Barracks** to train spearmen or archers.
- **Tap troops and then red units/buildings** to attack.
- **Move** highlights a destination and shows the selected unit's route as a dotted line with a target ring. An arrow at the edge of the screen points to offscreen waypoints.
- **Attack-move** advances towards the chosen target while engaging nearby enemies, then resumes the route when enemies are defeated.
- **Hold** makes soldiers defend within weapon range without chasing enemies.
- **Repair** on a selected villager lets you tap a damaged friendly building; repairing consumes wood.
- **Set rally** at the Village Centre or Barracks sends newly recruited units to a chosen position.
- **Cancel queued** returns the resources for the last queued training order.
- **Idle Villagers** on the map selects and centres a worker with no current assignment.
- **Under attack** red alert jumps to the threatened building; the minimap highlights recent attacks. Damaged buildings show health bars, cracks, smoke, and fire.
- **Tap actual unit and building sprites** to select them; you no longer have to tap precisely on the hidden ground tile.
- **Space** pauses on desktop; **I** finds an idle villager, **M** issues a move order, **Q** enters attack-move, **1** selects the army.
- **ARMY** selects all your combat units; **HOME** returns the camera to your village.
- **Tap the minimap** to reposition your camera.

## Objective

Gather resources, expand your settlement, defend against incoming enemies, and destroy the rival village centre.

## Technical details

One self-contained `index.html` file, plain JavaScript and Canvas 2D, no external libraries, no network calls or paid services. Browser-local autosaves every eight seconds and on tab close. Mobile portrait and landscape orientations supported.

## Current scope

One handcrafted skirmish map, Stone/Bronze/Iron progression, basic enemy AI, four economic resources plus population, basic fog of war, touch navigation and trainable units. Not a feature-complete replacement for the commercial games: no historical campaigns, selectable civilizations, multiplayer, naval combat, or original artwork.

## Asset credits

The artwork is from OpenGameArt with credited CC0 and CC BY-SA licensed packs. See [ASSET_CREDITS.md](ASSET_CREDITS.md) for each artist, source and licence. The game makes no claim to the artwork or code from the commercial Age of Empires series.
