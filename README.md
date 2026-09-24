# GameBox

A mobile-first browser games hub from **Chip In Games**.

## Included games

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
