# Santa's Potion Sort

A standalone, mobile-first Christmas water-sort puzzle for the GameBox festive games range.

**Play:** `christmas-potion-sort/` from the GameBox home screen. Tap a bottle with liquid, then an empty bottle or one with matching top liquid. A tap automatically pours the entire contiguous top colour, limited by capacity. Fill every nonempty bottle with four matching layers to complete a room.

**Features:** deterministic progressively complex levels (3–8 colours), two empty bottles, unlimited undo, restart, visual hint, optional colour-letter labels for accessibility, synthesised optional sound, stars, level picker, touch/mouse/keyboard input, saved level unlocks and active puzzle state.

## Local artwork

Uses original CSS-drawn glass bottles and scene effects, plus existing approved **Kenney** holiday graphics already committed to GameBox:
- `../assets/gamebox/kenney/2d/Background Elements Remastered/treePineSnow.png`
- `../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_red.png`, `present_small_green.png`, `present_small_blue.png`

No assets from the reference commercial mobile game are copied. The art style and interface are original.

## Puzzle correctness

`engine.mjs` builds each puzzle by applying reverse moves to a solved position where **each step can be undone by one legal forward water sort move**. The accompanying constructive proof is checked for the first 120 levels by `engine.test.mjs`, including forward auto-pour batch sizes, colour counts and capacity. The source puzzle layout is seeded by level for repeatable play. No adverts, paywalls or blind random hidden layers are used.

## Test

```sh
node --test christmas-potion-sort/engine.test.mjs
```

`browser-smoke.cjs` is run by `.github/workflows/christmas-potion-sort.yml` in three mobile Chromium viewports, including a complete solution and reload test. GameBox's root index and `hub/index.html` both contain the Christmas game tile.

Keyboard: 1–9 selects a bottle, U undoes and Escape opens/closes the menu. For later 10-bottle levels, use touch or mouse to select bottle 10.
