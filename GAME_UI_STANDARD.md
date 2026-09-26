# GameBox Professional Mobile Game UI Standard

Use this as the default design brief for GameBox gameplay screens, with game-specific art direction layered on top.

## Core objective

Design the experience as a finished commercial mobile game, not as a website, dashboard, form or collection of styled cards. The game itself must dominate the screen. Interface elements exist only to help the player understand the current state, identify the next action or access something they deliberately asked for.

## 1. Gameplay first

- Give the primary game surface the largest possible share of the viewport.
- Do not surround gameplay with permanent explanatory panels, helper paragraphs or decorative UI that competes with it.
- During active play, remove normal website chrome unless it performs a genuine game-HUD function.
- Prefer a compact HUD over stacked cards.
- Avoid card soup. Use spacing, alignment, typography and hierarchy before adding another container.

## 2. Mobile spatial hierarchy

Use predictable zones:

- **Top:** glanceable status only — current player, phase, score, timer, turn state and an infrequently used menu.
- **Centre:** gameplay.
- **Bottom / lower third:** frequent controls and primary actions, placed for natural thumb reach.
- **Overlay / sheet:** rules, settings, connection detail, restart, leave game and other infrequent actions.

Do not place frequently tapped primary controls at the top of a phone unless the game itself requires it.

## 3. Progressive disclosure

- Keep rare actions behind one predictable menu, drawer, popover or bottom sheet.
- Only show controls relevant to the current phase.
- Hide irrelevant controls instead of leaving a large collection of disabled buttons on screen.
- Keep rules and help available, but not permanently visible during play.
- Use onboarding or contextual hints only when the player actually needs them.

## 4. Communicate visually, not with permanent prose

- Replace instructions with affordances: highlights, movement, glow, state colour, animation, spatial grouping and tactile feedback.
- Use brief transient hints, toasts or first-use guidance rather than repeating full sentences every turn.
- A player should usually be able to identify the next action without reading a paragraph.
- Text in the permanent HUD should be short enough to scan, not read.

## 5. Tactile commercial-game presentation

Create a coherent game-specific material system:

- layered surfaces rather than flat rectangles;
- hard shadows for physical press depth;
- soft ambient shadows for elevation;
- restrained gradients and highlights for material;
- inset shading where it improves physicality;
- deliberate border treatment;
- consistent radii and spacing;
- bold display typography for game states and quieter utility typography for metadata.

Buttons should look and feel pressable. Tiles should feel like game pieces. Overlays should feel like part of the game rather than browser dialogs.

## 6. Interaction states

Every interactive control should have designed states for the states it actually uses:

- normal;
- hover where relevant;
- pressed;
- selected;
- available;
- unavailable;
- disabled;
- current;
- completed;
- waiting / remote turn.

Do not rely on opacity alone when a more meaningful state treatment is useful.

## 7. Colour has meaning

Assign colour by role and keep those roles consistent.

Examples:

- player colours identify ownership;
- gold can indicate an available insertion/action;
- teal can indicate reachable/valid/success;
- muted navy/grey can indicate waiting or unavailable;
- red is reserved for destructive actions.

Do not use colour only as decoration if the same colour is also carrying game-state meaning.

## 8. Motion and game feel

Use subtle, quick feedback to make interactions feel responsive:

- press/depress motion;
- board/tile movement response;
- selection pulses;
- score/relic feedback;
- state transitions;
- sheet/modal movement;
- optional light haptics where supported.

Motion should normally complete in roughly 100–300 ms and should clarify an action rather than delay it. Respect reduced-motion preferences.

## 9. Game-native iconography

- Avoid emoji as primary interface artwork.
- Avoid browser-looking arrows, selects and controls where a designed game control is practical.
- Use a coherent icon/glyph language.
- Game pieces and objectives should look like part of one visual system.

## 10. Responsive composition

Do not merely shrink a desktop layout.

- Recompose for portrait and landscape.
- Preserve gameplay area first.
- Respect safe areas.
- Keep frequently used controls comfortably tappable.
- Reposition or simplify secondary UI on smaller screens.
- Test short-height phones as well as narrow phones.

## 11. Setup and lobby screens

Setup can contain more conventional controls than gameplay, but should still feel like a game.

- Keep copy concise.
- Make the primary decision or CTA dominant.
- Do not explain obvious controls in paragraphs.
- Show connection/lobby status clearly.
- Use the same materials, typography and interaction language as the game.

## Maze Shift application

For Maze Shift specifically:

- The maze board must visually dominate active play.
- Current player and phase belong in a compact top HUD.
- The target belongs in the lower HUD near the controls.
- Spare tile and rotate controls belong in the bottom thumb zone during the shift phase.
- During movement, hide rotate controls and show only movement-relevant action such as Stay / End Turn.
- Insertion arrows are the primary shift affordance and should visually advertise availability.
- Reachable tiles are the primary movement affordance and should glow clearly.
- Player list, rules, mode/network details and Leave Game belong behind the game menu.
- Pass & Play privacy uses a full handoff overlay.
- Relic collection should use transient feedback rather than permanent explanatory text.
- Local Multiplayer must keep the host authoritative and clients should only be able to act on their own turn.
