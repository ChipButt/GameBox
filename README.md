# GameBox

A mobile-first browser games hub from **Chip In Games**.

## Repository layout

| Folder | Contents |
| --- | --- |
| `hub/` | GameBox menu, Card Deck and Coin Flip (their existing shared implementation) |
| `heads-up/` | Heads Up scripts, styling and source page |
| `disc-rally/` | Disc Rally, artwork and `editors/` |
| `shift-in-maze/` | Shift In Maze, tiles, relics, artwork and `editors/` |
| `bingo/` | Bingo source page, scripts and styling |
| `core-empires/` | Core Empires (existing folder preserved) |
| `sweet-truck-fever/` | Sweet Truck Fever colour-sorting delivery game |
| `race-manager/` | Gridline Racing (existing folder and URLs preserved) |
| `unfinished-business/` | Unfinished Business (existing folder and URLs preserved) |
| `shared/` | Player roster, networking, shared styles and menu/branding assets |
| `tools/` | Compatibility-page generation, file-move inventory and path checks |

The root HTML pages are generated **compatibility entry points**. They preserve the existing URLs without redirects or extra loading logic. Edit the corresponding source page in its game folder, then run:

```sh
python3 tools/sync-entry-points.py
python3 tools/sync-entry-points.py --check
python3 tools/check-paths.py
```

Source HTML pages use an explicit base URL so their relative resources and navigation behave exactly like the root entry pages. Root `index.html` remains the public hub. The Heads Up manifest stays at its existing URL with unchanged identity, scope and start URL. Do not split Card Deck and Coin Flip's combined implementation just to change folders.

This organisation changes resource paths only: game logic, storage keys, multiplayer identifiers, layouts and image bytes are preserved. `tools/file-moves.json` records every relocation. The path check documents `maze_shift_ui.png` as already missing before this reorganisation; this change does not invent or replace that artwork.

## Included games

### Sweet Truck Fever
- Mobile-first colour-sorting and parking puzzle game
- Tap clear trucks to send them into loading spaces
- Match delivery trucks to the moving stream of coloured sweets
- Later levels add denser traffic, more colours and hidden trucks
- Progress is stored locally in the browser
- Play at `sweet-truck-fever/`


### Relic
- Mobile-first real-world treasure hunting adventure prototype for Bidford-on-Avon
- Ten distinct illustrated relics across one riverside adventure, with GPS search zones and a full from-anywhere Preview mode
- First-use cinematic onboarding plus contextual guidance for Explore, Adventures, Collection and Home
- Search Mode deliberately removes precise navigation so the player hunts for the physical mark, then NFC/URL-style scans unlock animated rewards
- Persistent XP, gold, field-folio collection, dog companion, gear unlocks and adventure completion stored locally
- NFC-ready deep links use unique relic IDs such as `relic-trail/?relic=BID-01`; prototype scanning is available on-screen before hardware is installed
- Installable PWA shell, MapLibre/OpenFreeMap mapping, haptics/vibration where supported, procedural vector relic art and responsive mobile presentation
- The ten current coordinates are prototype search-zone locations only and do not imply permission to mount physical markers
- Play at `relic-trail/`

### Core Empires
- Single-player mining and army evolution prototype
- Worker assignments, transport bottlenecks, cart upgrades, and tap mining
- Three troop classes across Stone, Bronze, and Iron ages
- Six territories with automatic battles and live reinforcement deployment
- Mobile Battle / Mine / Evolve tabs and local saved progression
- Play at `core-empires/`


### Card Deck
- 1–4 players
- 54-card deck including red and black jokers
- Assign rules to each card rank and both jokers
- Separate Setup and Game Play modes
- Save and load named card-game presets in the browser
- Turn tracking, draw history, and Shuffle & Restart
- Optional same-Wi-Fi multiplayer: each player uses their own phone, only the current player's phone can turn the next card, and every connected phone receives the same result and next-turn state

### Coin Flip
- 1–4 players
- Set a custom number of coins for each player
- Turn-based multi-coin flipping
- Heads/tails totals and streak win conditions
- Save and load named coin-game presets
- Optional same-Wi-Fi multiplayer: only the current player's phone can flip, with results and scores synchronised to every connected phone

### Heads Up
- Built-in and custom decks
- 30/45/60/90 second rounds
- Tilt down for Correct and up for Pass, with fallback buttons
- Optional same-Wi-Fi multiplayer: each player gets their own active round on their own phone while the other phones show whose turn it is, the current clue and running score
- Multiplayer automatically moves to the next connected player's device and finishes with a shared scoreboard

### Disc Rally
- Turn-based mobile disc racing with a close third-person chase camera
- Disc Drivin'-style setup flow rebuilt in the Chip In visual system
- Pass & Play: Start New Race → Track Selection → Players → Start Race
- Local Multiplayer: host/join flow using GameBox WebRTC discovery
- 2–4 players, manual Finish Turn or automatic 3-second handoff after motion stops, and per-device turn ownership
- Crossing the final finish line locks in the finish but the player still completes the current turn, including any available second flick and Turbo
- Drag-to-flick controls with free-look before a shot, a second flick available only while the first flick is still moving, and a movement-charged Turbo meter; Turbo activates only when full, is held during motion, can be released early, and then recharges from the remaining level
- Disc-to-disc collisions plus normal-based curved wall rebounds
- Smaller racing discs for more overtaking room, smoother camera follow, and lighter per-frame HUD work for better mobile motion
- Checkpoint-based laps to prevent shortcut finishes
- Six original long-form tracks with genuinely different, non-crossing course geometry; rail edges are validated against self-intersections, road chevrons show race direction, and track-selection mini-maps are generated from the same paths used by rendering, rails, collisions and lap progress


### Bingo
- 90-ball Bingo Master and player system
- Two caller modes: secure digital number draw or manual entry from a physical bingo ball dispenser
- Permanent reusable card library with unique CI-xxx serials, so physical cards can be printed once and reused across events
- Master-controlled card issuing: joining a digital room does not automatically grant a playable card
- Physical-card issue ledger and game-pot tracking
- Print / Save PDF layout for batches of four physical cards per A4 sheet
- Authoritative call history with void-last-call audit trail
- 1 Line, 2 Lines and Full House stages
- Physical claims can be checked instantly by entering the printed card serial
- Digital claims are verified against the Bingo Master's copy of the issued card and called-number history
- Live digital player mode uses a room code and peer connection; use only where the operator's licensing arrangements permit remote bingo


### Gridline Racing
- Mobile-first racing team management game
- Live-race upgrades and tactical decisions
- Sponsor income and finishing-position prize money
- Bot-filled races and persistent progression
- Same-Wi-Fi multiplayer races using direct browser-to-browser WebRTC connections
- Empty multiplayer grid positions are filled by bots


### Maze Shift
- Mobile-first 2–4 player shifting-maze strategy game with Pass & Play and Local Multiplayer
- 7×7 maze with a rotatable spare tile and legal row/column insertion points
- The tile pushed out becomes the next spare tile, with pawns wrapping correctly across a shifted line
- Immediate reversal of the previous player's shift is blocked
- Connected-path movement is calculated from the live tile layout and highlighted on the board
- Private sequential relic targets, selectable game length, and a return-to-home win condition
- Local Multiplayer uses the existing GameBox discovery/WebRTC layer with host-authoritative board state and per-device turn ownership\n- Uses the existing GameBox player roster stored on each device

## Local multiplayer

GameBox uses direct **WebRTC peer-to-peer connections**. One device hosts and creates an invite code. Each friend pastes that invite into their device, creates an answer code, and sends it back to the host. After that, the devices communicate directly.

This approach requires no paid backend, account or database. It is intended primarily for devices on the same Wi-Fi network. Some public or guest Wi-Fi networks enable client isolation and may prevent devices from connecting directly.

### Bluetooth

The GitHub Pages/browser version does not use Bluetooth for game-to-game networking. Web Bluetooth is not a dependable browser-to-browser transport across iPhone and Android, particularly on iOS. A future native iOS/Android build could add Bluetooth or platform-native nearby-device networking while keeping the same game-state protocol.

## Chip In branding

New GameBox work uses the Chip In visual system: navy `#082f68`, secondary navy `#0a3d80`, gold `#f7bd18`, pale mint `#eefaf5`, white cards and Fredoka/Inter typography.

## Mobile first

The interface is designed for phones first, with large touch targets and layouts that work well on smaller screens. GitHub Pages is recommended because it provides HTTPS, which is important for browser features such as motion sensors and WebRTC.

## Run

Deploy the repository with GitHub Pages or another HTTPS static host. No application backend, API key or external database is required. Saved setups and single-device progression use browser `localStorage`, so they remain on that browser/device.
