# Snowy Sweets · Christmas match-three game

A standalone pixel-art match-three game in GameBox, currently a **test candidate** for Advent2026.

## Gameplay
- Swipe or tap to swap neighbours. Invalid swaps smoothly reverse and do not consume a move.
- Match 3 sweets to clear; match 4 to make row or column striped power sweets; match 5 or more to create a burst special built from the matching sweet.
- Swaps travel between positions, matches pop with candy-sprite particles, and each piece physically drops to its new cell in cascades.
- Ice breaks when the sweet in its square clears; some later tiles require two hits.
- 12 selectable levels have distinct moves and sweet-collection, score, or ice goals.
- Move and score counters, sound, hints, restart, level select, level stars and browser-saved progress.

## Production artwork and visual consistency
All six match pieces use the existing Kenney Pixel Platformer Food Expansion artwork. Two full-height pieces are assembled into real RGBA PNGs so neither clips at a source tile boundary:
- `tile_0014.png` · iced doughnut
- `candy-cane-complete.png` · hook from source tile 0041 joined seamlessly to the matching stem from source tile 0057
- `ice-lolly-complete.png` · upper ice-lolly body from source tile 0043 with the handle taken from source tile 0044, rotated, plus a finished lower outline
- `tile_0058.png` · biscuit
- `tile_0080.png` · ice cream
- `tile_0082.png` · frosted sundae

The completed sprites are centred in 32×32 transparent PNG canvases and sized to fit entirely within an individual board cell; powered-up specials reuse these same complete images.

The truncated-looking marshmallow and frosted-cake fragments were removed. Row, column and burst specials keep their *original sweet image*, differentiated by small Kenney pixel-art stripes and subtle animation instead of separate presents.

Additional source sprites from the same user's Kenney library:
- `tile_0096.png`, `tile_0097.png` · special-move strips and match particles
- `snow_base.png`, `snow_flecks.png` · Tiny Ski snow tiles
- `ice_block.png` · Platformer Assets Ice visual
- Kenney Holiday Pack · Christmas panel illustration
- Kenney UI Pack / Adventure · buttons, frame and menu icons
- Kenney Retro Textures Fantasy · wood table surface

**Art is not generated with CSS shapes.** CSS is used for sprite layout and motion only; all candy and board-tile art comes from existing PNG files.

## Deployment
- Play: `https://chipbutt.github.io/GameBox/snowy-sweets/`
- GameBox: `https://chipbutt.github.io/GameBox/`
- This candidate is not yet added to Advent2026. The Advent day-lock mechanism stays in the parent calendar, not here.

## Testing limitations
The game engine was verified through scripted 12-level match/move/cascade simulations and JavaScript syntax checks. Manual browser gameplay, visual review and device animation performance still need checking before Advent approval.
