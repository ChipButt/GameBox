# Snowy Sweets

A standalone, mobile-first Christmas match-three game for GameBox, intended as a test candidate for Advent2026.

## Play
- GameBox shelf: `../`
- Standalone: `snowy-sweets/`
- Swipe two neighbouring sweets, or tap one and then its neighbour.
- Three matching sweets clear. Four make a row/column power sweet; five or more make a wrapped-present burst.
- Ice tiles are broken by clearing the sweet on top. Some late ice tiles have two layers.
- Each of the twelve levels has a limited move count and a collection, ice, or points objective.
- Non-matching swaps are returned without using a move. Cascades, combos and special-power chains are resolved automatically.
- If the board has no legal swap, the sweets reshuffle while the ice and level progress stay intact.
- A hint, restart, sound setting, level picker and help are available in-game.
- All 12 levels are selectable in this **test edition**, independent of any Advent day-lock logic.
- Scores, earned stars, last selected level and audio choice persist in localStorage.

## Visual assets (already in the GameBox repository)
- Kenney Platformer Assets Candy: red, green, yellow candies, pink candy cane, red/white lollipop
- Kenney Platformer Assets Holiday: red present for earned burst power
- Kenney Physics Assets: glass overlay on ice
- Kenney Holiday Pack 2016: Christmas decoration for menus
- Kenney Retro Textures Fantasy: wooden gameplay table
- Kenney UI Pack and UI Pack - Adventure: buttons, icons, panel frame

No remote runtime dependencies, new asset imports, placeholder emojis or generated sprite illustrations. UI shares the compact GameBox Christmas styling seen in Festive Blocks and Jigsaw.

## Advent integration
Not yet in Advent2026. Keep this standalone in GameBox for testing first; Advent2026 will control the day unlocking when it is approved.