# Gridline Racing assets

This directory is the single canonical location for Gridline Racing production artwork.

## Structure

- `cars/` — 12 approved top-down car sprites. `player_gold.png` is the local player's car.
- `tracks/` — the 4 approved selectable tracks:
  - `forest_lake.png`
  - `mediterranean_marina.png`
  - `desert_canyon.png`
  - `snowy_alpine.png`
- `ui/logo/` — Gridline Racing logo.
- `ui/hud/` — player profile, race-name banner and live stat pills.
- `ui/upgrades/enabled/` and `ui/upgrades/disabled/` — approved upgrade card states.
- `ui/controls/` — Back, Settings, Race Now, Host Game and Join Game.
- `ui/popups/` — 50/50 decision, race-complete and next-race popups.
- `ui/countdown/` — individual lights/numbers and the approved 3/2/1/GO state images.
- `ui/race_status/` — green flag and Final Lap assets.

Do not add duplicate Gridline artwork at repository root. New Gridline artwork belongs under this directory and game code should reference it with paths relative to `race-manager/`, e.g. `assets/tracks/forest_lake.png`.
