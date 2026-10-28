# Paper War — Requirements

**Version:** 0.2 (post-visibility correction)  
**Date:** 2026-10-26  
**Supersedes:** v0.1

---

## Correction Notice (v0.2)

Version 0.1 specified hidden-information gameplay (fog of war, commit/reveal protocol, pass-device privacy screen). **This was incorrect.** The game is fully open-information: both armies are visible to both players at all times. The challenge is geometric — you must mentally mirror the crease to aim correctly. All v0.1 requirements that conflict with this are replaced below.

---

## Resolved Conflicts from v0.1 → v0.2

**C1 — Aiming on own half:** Reticle moves on the player's OWN half. A shot at (u,v) on own half lands at (u,v) on the opponent's half after the fold. (Was: reticle on opponent's half.)

**C2 — No privacy screens:** The pass-device screen between turns and between deployment steps is removed. Replaced by a brief "Player X's Turn" handoff banner. (Was: full-screen blocking pass screen.)

**C3 — No commit/reveal:** No SHA-256 commitment protocol. Both clients compute shot results locally from the full shared state. A lightweight state-hash consistency check replaces commit/reveal. (Was: `ready(commitment)` + `shotResult` + `reveal` messages.)

**C4 — AI sees the board:** AI strategies use the full visible board state. Difficulty comes from aim error and target priority, not search strategy. (Was: heatmap blind search.)

---

## Functional Requirements

### FR-1: Core Game Rules

**FR-1.1** — WHEN a game is configured, THEN the board SHALL consist of two equal halves separated by a center crease; Player 1 owns the left/top half, Player 2 owns the right/bottom half.

**FR-1.2** — WHEN a player deploys their army, THEN it SHALL contain exactly 5 Soldiers, 1 Queen, and 1 King.

**FR-1.3** — WHEN a unit is placed, THEN it SHALL be validated: (a) fully inside the player's half with margin `CREASE_MARGIN` from the crease and `EDGE_MARGIN` from all edges; (b) not overlapping any other unit (center-to-center distance ≥ sum of radii + 6 reference units).

**FR-1.4** — WHEN a player fires a shot at position (u,v) on THEIR OWN half, THEN the system SHALL treat the shot as landing at the SAME (u,v) on the OPPONENT's half, and compute a hit if any enemy unit U satisfies `distance(u,v, U.center) < U.hitRadius + SHOT_RADIUS`.

**FR-1.5** — WHEN a shot hits a Soldier or Queen with standard rules, THEN that unit SHALL be marked dead after 1 hit.

**FR-1.6** — WHEN the "Queen takes 2 hits" rule is enabled, THEN the Queen SHALL require 2 hits to die.

**FR-1.7** — WHEN a shot hits the King, THEN the King SHALL be marked dead and the game SHALL enter GameOver with the attacker as winner.

**FR-1.8** — WHEN the "all units win" rule is enabled AND all enemy units are destroyed, THEN the game SHALL enter GameOver with the attacker as winner.

**FR-1.9** — WHEN a shot lands on a dead unit's position (within combined radii), THEN the result SHALL be `"waste"` with a micro-animation; turn still advances.

**FR-1.10** — WHEN a shot misses all living units, THEN a permanent miss mark SHALL be rendered on the opponent's half.

**FR-1.11** — WHEN the "shots per turn" rule is set to N (1–3), THEN a player SHALL fire N shots before the turn passes.

### FR-2: Visibility

**FR-2.1** — WHEN the battlefield is rendered, THEN ALL units on BOTH halves SHALL be visible to both players at all times — alive units with their unit art, dead units with their dead marker.

**FR-2.2** — WHEN a unit is placed during deployment, THEN it SHALL be visible on that player's half to both players immediately (or after Ready, per the `showUnitsAfterReady` config flag — default: after Ready).

**FR-2.3** — WHEN `showUnitsAfterReady` is `false`, THEN opponent units appear live as they are placed during deployment.

### FR-3: State Machine

**FR-3.1** — State machine: `MainMenu → (Lobby, if online) → Setup → TurnLoop [Aiming → Fired → Folding → Pressing → Unfolding → Resolving → TurnHandoff] → GameOver → (Rematch | MainMenu)`.

**FR-3.2** — WHEN any action is dispatched, THEN the reducer SHALL reject illegal transitions by returning unchanged state.

**FR-3.3** — WHEN both players lock layouts, THEN the phase SHALL transition to `Aiming` for Player 1.

**FR-3.4** — WHEN the win condition is met in Resolving, THEN the phase SHALL transition directly to `GameOver`.

### FR-4: Deployment Phase

**FR-4.1** — WHEN in Setup, THEN each player places units on their own half via tap-to-place or drag-and-drop.

**FR-4.2** — WHEN a placement is invalid, THEN a red ghost SHALL indicate the invalid position.

**FR-4.3** — WHEN "Randomize" is clicked, THEN all units SHALL be assigned valid random positions.

**FR-4.4** — WHEN "Reset" is clicked, THEN all units SHALL return to the unplaced tray.

**FR-4.5** — WHEN all units are validly placed, THEN the "Ready" button SHALL activate and lock the layout on click.

**FR-4.6** — WHEN playing locally AND Player 1 has locked their layout, THEN a brief "Player 2 — place your army" banner SHALL appear before Player 2's deployment UI (no full-screen blocking). **No pass-device privacy screen.**

### FR-5: Battlefield UI

**FR-5.1** — WHEN on the battlefield, THEN both halves SHALL show ALL units (own and opponent) alive and dead.

**FR-5.2** — WHEN a player is aiming, THEN a movable reticle SHALL appear on THEIR OWN half only. The reticle position (u,v) is the shot position; the fold carries ink to the same (u,v) on the opponent's half.

**FR-5.3** — WHEN aiming, THEN a magnifier loupe SHALL appear above the touch point.

**FR-5.4** — WHEN "Show target helper" is enabled (beginner mode), THEN while the player aims at (u,v), a pulsing marker SHALL briefly highlight (u,v) on the opponent's half to help visualise where ink will land.

**FR-5.5** — WHEN "Fire" is tapped, THEN the fold animation SHALL begin (see FR-7).

**FR-5.6** — WHEN the fold animation is playing, THEN tapping anywhere SHALL skip to the end state.

**FR-5.7** — WHEN `prefers-reduced-motion` is set, THEN the fold animation SHALL be replaced by a fast crossfade with the dot appearing.

**FR-5.8** — WHEN a hit or kill occurs, THEN a theme-specific hit effect SHALL play.

**FR-5.9** — WHEN the "Queen hit reveals King's quadrant" rule is active AND the Queen is destroyed, THEN the King's quadrant SHALL be highlighted on the opponent's half.

**FR-5.10** — WHEN it is the opponent's turn in local mode, THEN a "Player X's Turn" banner SHALL appear. A tap dismisses it. **No full-screen blocking.**

**FR-5.11** — WHEN aiming aids are enabled, THEN "Faint mirror ghost" SHALL show a faint overlay of where the dot would land on the opponent half, and "Crease ruler" SHALL show distance tick-marks along the crease.

### FR-6: Game Modes

**FR-6.1** — Local Pass & Play: both players share the device. No privacy screen. A brief handoff banner identifies whose turn it is.

**FR-6.2** — Vs AI: Player 2 is replaced by an AI at the selected difficulty. AI placement is randomized and valid.

**FR-6.3** — Online: one player hosts (4-digit room code), the other joins. Both can see the full board.

### FR-7: Fold Animation

**FR-7.1** — WHEN a shot is fired, the fold animation SHALL play in sequence (~1.6 s total, skippable):  
1. Ink dot appears at (u,v) on the player's OWN half (60 ms).  
2. The own half rotates about the crease edge with 3D perspective (600 ms). A shadow grows as the half approaches the opponent's side.  
3. Press pulse (board scale 1→0.97→1) + camera rumble scaled by hit weight (160 ms).  
4. Own half rotates back (600 ms).  
5. Ink dot appears at (u,v) on the OPPONENT's half with bleed-in effect (180 ms); hit/miss effect plays.

**FR-7.2** — WHEN folding, the paper's back face SHALL show the paper texture (`backface-visibility`, `transform-style: preserve-3d`).

**FR-7.3** — WHEN folding, a box-shadow SHALL grow as the half approaches and recede on unfold.

**FR-7.4** — WHEN a kill occurs, camera rumble amplitude SHALL scale: King kill = 1.0, Queen = 0.6, Soldier = 0.3.

**FR-7.5** — The animation SHALL use only `transform` and `opacity` (GPU-only; no layout properties).

### FR-8: Themes

Unchanged from v0.1 FR-7.1–FR-7.6.

### FR-9: Online Multiplayer (Simplified)

**FR-9.1** — WHEN hosting, THEN the system SHALL generate a 4-digit room code with up to 5 collision retries and display copy + share-link buttons.

**FR-9.2** — WHEN a guest enters a valid code, THEN a PeerJS connection SHALL be established and both players SHALL see each other's ready state.

**FR-9.3** — WHEN both players are ready, THEN the host sends `ready(seq, skinId, inkColor)` to sync display preferences. **No commitment exchange.**

**FR-9.4** — WHEN a player fires, THEN the attacker sends `shot(seq, u, v)`. Both clients compute the result from their identical shared state using the same pure function.

**FR-9.5** — AFTER each shot, each client SHALL send `stateHash(seq, hash)` where `hash = SHA-256(shotLog JSON)`. If hashes differ, a "Desync detected" dialog with a resync option SHALL appear.

**FR-9.6** — WHEN a player disconnects, THEN the opponent SHALL see a 30-second countdown with a "Forfeit" option.

**FR-9.7** — WHEN a reconnect occurs within 30 seconds, the game SHALL resume from last known state.

**FR-9.8** — ALL incoming messages SHALL be validated with Zod before processing; coordinates SHALL be clamped to [0,1].

**FR-9.9** — WHEN a `rematch` request times out (15 s without response), THEN the requester SHALL see "Opponent declined or left."

### FR-10: AI Opponent (Sees the Board)

**FR-10.1** — WHEN the AI fires, THEN it SHALL place its shot on its OWN half. The shot at (u,v) lands at (u,v) on the opponent's half (the player).

**FR-10.2** — All AIs use `idealShot(unit) → (u,v)` (the exact mirror of the target unit's position) and `applyAimError(point, sigma, rng) → Vec2` (Gaussian perturbation clamped to [0,1]).

**FR-10.3** — WHEN AI difficulty is Easy, THEN: pick a random alive enemy unit; apply sigma=60 aim error; with 25% probability fire at a completely random point instead.

**FR-10.4** — WHEN AI difficulty is Medium, THEN: prefer units not yet hit; sigma=30; target nearest to own crease first (easier to hit); after a miss, apply a correction offset toward the target with added noise (converges in ~2–3 turns).

**FR-10.5** — WHEN AI difficulty is Hard, THEN: sigma=8; priority: King > Queen > "double-hit soldier" (soldier whose neighbors allow hitting 2 units in one shot); choose the shot that maximises unit overlap with the dot circle; prefer King even at lower overlap.

**FR-10.6** — WHEN any AI fires, THEN it SHALL wait 700–1500 ms (visible thinking indicator) before submitting the shot.

**FR-10.7** — WHEN the AI places units, THEN placement SHALL be randomized, valid, and different across games.

**FR-10.8** — WHEN Hard is simulated against Medium and Medium against Easy over 1000 games each, THEN Hard SHALL win ≥70% against Medium, and Medium SHALL win ≥70% against Easy.

### FR-11: Persistence — unchanged from v0.1 FR-10.

### FR-12: Accessibility & Mobile — unchanged from v0.1 FR-11.

### FR-13: Audio — unchanged from v0.1 FR-12.

---

## Non-Functional Requirements

**NFR-1 (Performance):** Initial JS bundle < 200KB gzipped. 60fps on mid-range Android. Lighthouse mobile ≥ 90.

**NFR-2 (Type Safety):** TypeScript strict mode, zero `any`. ESLint clean.

**NFR-3 (Testability):** All game logic in `/lib` is framework-free and unit-testable headlessly.

**NFR-4 (Deployability):** `next build` succeeds; deploys to Vercel with no server for core play.

**NFR-5 (Resilience):** No blank screens; ErrorBoundary on all routes; network errors show toasts.

**NFR-6 (Reproducibility):** Seeded RNG everywhere in game logic and AI.

**NFR-7 (i18n-readiness):** All user-visible strings through `t()`.

---

## Removed from v0.1

- FR-4.4 (aiming on opponent half) → replaced by FR-5.2
- FR-5.1 (privacy screen between local turns) → replaced by FR-5.10
- FR-5.4 (commitment exchange before Setup) → removed entirely
- FR-8.3 (SHA-256 commitment) → removed
- FR-8.4 (shotResult message) → removed
- FR-8.5 (reveal + cheat detection) → removed
- FR-9.1–FR-9.3 (heatmap AI, blind search) → replaced by FR-10
- `PassDeviceScreen` usage between turns → removed
- `commitment.ts`, `generateSalt`, `verifyCommitment` → deleted
- `SET_COMMITMENT`, `REVEAL_LAYOUT`, `CHEAT_DETECTED` reducer actions → deleted
- `cheatDetected`, `commitment`, `salt` fields → deleted from types

---

## Out of Scope (v1, unchanged)

Accounts, leaderboards, matchmaking, >2 players, server-side logic, Supabase integration, >3 themes, native apps.
