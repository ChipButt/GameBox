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
