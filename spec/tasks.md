# Paper War — Implementation Tasks

**Version:** 0.2 (post-visibility correction)  
**Date:** 2026-10-26

---

## Correction Phase (v0.1 → v0.2)

These tasks supersede conflicting v0.1 tasks.

### Task C.1 — Update Types: Remove Hidden-Info Fields
- Remove `commitment`, `salt`, `cheatDetected` from `PlayerState` / `GameState` in `lib/game/types.ts`.
- Add `syncError: boolean` to `GameState`.
- Remove `GameAction` variants: `SET_COMMITMENT`, `REVEAL_LAYOUT`, `CHEAT_DETECTED`.
- Remove `Shot.revealedQuadrant` (king quadrant reveal still works, but through a different field).
- ✓ `npm run typecheck` exits 0.

### Task C.2 — Update Reducer: Remove Hidden-Info Actions
- Remove `SET_COMMITMENT`, `REVEAL_LAYOUT`, `CHEAT_DETECTED` cases from `gameReducer`.
- Add `SYNC_ERROR` action.
- ✓ All reducer tests still pass; removed-action tests deleted.

### Task C.3 — Update Protocol: Simplified Online Messages
- Rewrite `lib/net/protocol.ts`: remove `ReadySchema` (commitment), `ShotResultMsgSchema`, `RevealSchema`.
- Add `ReadyV2Schema` (`{ type: "ready", skinId, inkColor, seq }`), `StateHashSchema`.
- ✓ Protocol tests updated and passing.

### Task C.4 — Delete Commitment Module and Tests
- Delete `lib/net/commitment.ts`.
- Delete `tests/unit/commitment.test.ts`.
- ✓ No reference to deleted files remains in the codebase.

### Task C.5 — Battlefield: Show All Units
- Update `BattlefieldScreen.tsx`: both halves render ALL units (alive + dead) for both players.
- Own half: own units + incoming shot marks.
- Opponent half: ALL opponent units (alive + dead) + own shot marks + optional target-helper overlay.
- Reticle moves to OWN half.
- ✓ Enemy units visible in all themes and modes.

### Task C.6 — Remove Pass-Device Screen from Turn Flow
- Remove `PassDeviceScreen` usage from `TurnControllerOverlay`.
- Replace with a dismissable "Player X's Turn" banner (auto-dismisses after 2 s or on tap).
- Remove `p1-pass` deploy step from `app/play/local/page.tsx`.
- Replace deployment pass with a simple "Player 2, place your army" inline banner.
- ✓ No blocking screen in local mode.

### Task C.7 — Fix Fold Animation
- Import and render `FoldAnimationLayer` in `BattlefieldScreen`.
- Wire `trigger={phase === "Folding"}`, `onComplete={handleFoldComplete}`, `side` derived from orientation and current player, `halfRef` pointing to the attacker's half div, `boardRef` pointing to the board container.
- Move `resolveCurrentShot()` to a `useEffect` on `phase === "Resolving"`.
- Separate `RESOLVE_SHOT` and `END_TURN`: show result flash for 1.2 s before `END_TURN` dispatches.
- Replace `Math.random()` in `FoldAnimationLayer` with seeded values derived from `gameState.config.seed + turn`.
- Ink dot on own half → fold → press → unfold → ink dot on opponent half.
- ✓ Fold animation plays visually; skip works; reduced-motion fallback works.

### Task C.8 — New AI: Aim-Error Model
- Delete `lib/ai/heatmap.ts`.
- Add `lib/ai/aimError.ts`: `idealShot(unit: Unit): Vec2` (returns unit.pos directly — the mirror), `applyAimError(pos: Vec2, sigma: number, rng: RNG): Vec2` (Gaussian noise, clamped).
- Update `AIView` in `lib/ai/types.ts`: add `visibleEnemyUnits: Unit[]` (all enemy units, alive).
- Rewrite `lib/ai/easy.ts`: random unit target, sigma=60, 25% full-random.
- Rewrite `lib/ai/medium.ts`: nearest-to-crease priority, sigma=30, correction learning.
- Rewrite `lib/ai/hard.ts`: King-first priority, sigma=8, maximize overlap.
- ✓ All AI tests updated and passing; difficulty ordering test passes.

### Task C.9 — AI Simulation Test Update
- Rewrite `tests/unit/ai-simulation.test.ts`: test Hard≥70% vs Medium, Medium≥70% vs Easy over 1000 games each.
- ✓ Tests pass.

### Task C.10 — Online Page: Remove Commitment Logic
- Update `app/play/online/page.tsx`: remove commitment exchange, `shotResult` handler, `reveal` handler.
- Add `stateHash` send/receive and desync dialog.
- Update `app/play/online/page.tsx` deployment: no privacy screen; both deploy simultaneously (each sees the other's units after Ready by default).
- ✓ Online mode compiles.

### Task C.11 — Update useAI Hook
- Update `hooks/useAI.ts`: pass `visibleEnemyUnits` in `AIView`.
- AI shot goes through `FIRE` → fold animation → `RESOLVE_SHOT` (same path as human player).
- ✓ AI mode plays correctly.

### Task C.12 — Full Test and Build Pass
- Run `npm run typecheck && npm run lint && npm run test && npm run build`.
- ✓ All pass.

---



**Version:** 0.1 (pre-implementation)  
**Date:** 2026-10-26  
**Status:** Awaiting approval

Tasks are ordered so each one builds on the previous. Every task ends with a verifiable criterion (✓). Run `npm run typecheck && npm run lint && npm run test` after each task. Run `npm run build` after tasks that complete a major vertical slice.

---

## Phase 0: Project Scaffolding

### Task 0.1 — Initialize Next.js Project
- Scaffold with `create-next-app` using TypeScript strict mode, App Router, Tailwind CSS, ESLint.
- Install dependencies: `framer-motion`, `zustand`, `zod`, `lucide-react`, `peerjs`.
- Install dev dependencies: `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `playwright`, `@playwright/test`.
- Configure `vitest.config.ts` with jsdom environment and path aliases.
- Configure `playwright.config.ts` targeting `localhost:3000`.
- Add scripts to `package.json`: `lint`, `typecheck`, `test`, `test:e2e`, `build`.
- ✓ `npm run typecheck` exits 0 on the empty project. `npm run test` exits 0 (no tests yet).

### Task 0.2 — Add Kiro Steering Files
- Create `.kiro/steering/product.md`: game concept, player experience goals, definition of done.
- Create `.kiro/steering/tech.md`: stack, normalized-coordinates rule, pure-lib rule, no-any rule, config-file rule.
- Create `.kiro/steering/structure.md`: directory map from design.md §14, naming conventions, component rules.
- ✓ All three files exist and contain the content described above.

### Task 0.3 — Base Layout and Global Styles
- Create `app/layout.tsx` with HTML structure, `<ThemeProvider>` placeholder, and `next/font` (Geist or similar).
- Create `styles/globals.css` with Tailwind directives and CSS variable placeholders for themes.
- Create `app/page.tsx` as a placeholder route.
- ✓ `npm run build` succeeds. `localhost:3000` renders without errors.

---

## Phase 1: Core Game Logic (Pure /lib)

### Task 1.1 — RNG Module
- Implement `mulberry32` seeded PRNG in `/lib/game/rng.ts`.
- Export `createRNG(seed: number): RNG` where `RNG` has `.next(): number` (0..1) and `.nextInt(min, max): number`.
- ✓ Unit test: same seed produces same sequence; different seeds differ; all values in [0,1).

### Task 1.2 — Types Module
- Create `/lib/game/types.ts` with all types from design.md §2: `Vec2`, `UnitType`, `Unit`, `ShotResult`, `Shot`, `PlayerId`, `PlayerState`, `GameMode`, `Difficulty`, `RuleConfig`, `GameConfig`, `GamePhase`, `GameState`, `GameAction`.
- Create `/lib/net/protocol.ts` with `NetMessage` discriminated union.
- ✓ `npm run typecheck` exits 0. No `any`.

### Task 1.3 — Config Module
- Create `/lib/game/config.ts` with `DEFAULT_CONFIG` from design.md §15.
- Export all constants as `as const`. No magic numbers anywhere else in the codebase.
- ✓ Unit test: `DEFAULT_CONFIG.ARMY` sums to 7 units; `HIT_RADIUS.king > HIT_RADIUS.queen > HIT_RADIUS.soldier`.

### Task 1.4 — Geometry Module
- Create `/lib/game/geometry.ts`:
  - `toRef(v: Vec2): Vec2` — multiply by REF_SIZE.
  - `fromRef(v: Vec2): Vec2` — divide by REF_SIZE.
  - `distance(a: Vec2, b: Vec2): number` — Euclidean in reference space.
  - `clamp01(v: Vec2): Vec2` — clamps each axis to [0,1].
  - `lerpVec2(a: Vec2, b: Vec2, t: number): Vec2`.
  - `quadrantOf(pos: Vec2): 0 | 1 | 2 | 3` — 0=TL,1=TR,2=BL,3=BR within a half.
- ✓ Unit tests: distance of known points; toRef/fromRef round-trip; clamp edge cases; quadrantOf corners.

### Task 1.5 — Placement Validation Module
- Create `/lib/game/placement.ts`:
  - `isValidPlacement(unit: Unit, existingUnits: Unit[], config: typeof DEFAULT_CONFIG): boolean`.
  - `randomPlacement(unitTypes: UnitType[], rng: RNG, config: typeof DEFAULT_CONFIG): Unit[]`.
  - `validateArmy(units: Unit[], config: typeof DEFAULT_CONFIG): ValidationResult`.
- ✓ Unit tests: valid placement passes; overlapping placement fails; out-of-bounds fails; crease violation fails; randomPlacement produces valid armies; deterministic with same seed.

### Task 1.6 — Rules Module (Hit Detection & Win Condition)
- Create `/lib/game/rules.ts`:
  - `computeShotResult(pos: Vec2, targetPlayer: PlayerState, rules: RuleConfig, config: typeof DEFAULT_CONFIG): { result: ShotResult; hitUnitId?: string; killedUnitType?: UnitType; quadrant?: 0|1|2|3 }`.
  - `checkWinCondition(targetPlayer: PlayerState, rules: RuleConfig): PlayerId | null`.
  - `applyShot(shot: Shot, targetPlayer: PlayerState, rules: RuleConfig): PlayerState`.
- ✓ Unit tests: shot within combined radii hits; shot just outside misses; shot on dead unit → waste; King kill → king dead and win condition; Queen-takes-2 requires two hits; quadrant returned when rule enabled.

### Task 1.7 — Game Reducer
- Create `/lib/game/reducer.ts`:
  - `gameReducer(state: GameState, action: GameAction): GameState`.
  - Implement all transitions from the FSM diagram.
  - Illegal transitions return state unchanged.
  - `createInitialState(config: GameConfig): GameState`.
- ✓ Unit tests: illegal transitions are no-ops; full happy-path sequence (StartGame → LockLayout×2 → Fire → Resolve → EndTurn → GameOver) produces correct state at each step; multi-shot turn decrements `shotsRemainingInTurn`.

---

## Phase 2: AI Strategies

### Task 2.1 — AI Types and Easy Strategy
- Create `/lib/ai/types.ts` with `AIView` and `AIStrategy` interfaces (from design.md §9).
- Create `/lib/ai/easy.ts`: uniform random, no repeats.
- ✓ Unit tests: all shots in bounds; no repeats after 100 shots; seeded sequence is deterministic.

### Task 2.2 — Medium AI Strategy
- Create `/lib/ai/medium.ts`: random unless hit active; hunt within 30-ref-px radius for next 2 turns.
- ✓ Unit tests: activates hunt mode after hit; hunt shots within radius; reverts to random after 2 hunt turns; no out-of-bounds shots.

### Task 2.3 — Hard AI Heatmap
- Create `/lib/ai/heatmap.ts`: `HeatmapModel` class with `update(shot: Shot): void`, `getWeights(): Float32Array`, `argmax(rng: RNG): Vec2`.
- Apply edge/crease prior, miss geometric subtraction, hit boost.
- Create `/lib/ai/hard.ts` using `HeatmapModel`.
- ✓ Unit tests: heatmap reduces probability around misses (cells within combined radius of a miss should have weight 0); heatmap increases probability near hits; argmax stays in bounds; all shots valid.

### Task 2.4 — AI Simulation Test
- Create `tests/unit/ai-simulation.test.ts`.
- Simulate 1000 Hard vs Easy games with seeded RNG; verify Hard wins ≥ 850.
- Also test: AI placement is valid (passes validateArmy); AI never shoots the same point twice.
- ✓ Test passes (may need generous timeout: 30s).

---

## Phase 3: Network Layer

### Task 3.1 — Commitment Module
- Create `/lib/net/commitment.ts`:
  - `createCommitment(units: Unit[], salt: string): Promise<string>` — SHA-256.
  - `generateSalt(): string` — 32 hex chars.
  - `verifyCommitment(units: Unit[], salt: string, commitment: string): Promise<boolean>`.
- ✓ Unit tests: same input → same hash; wrong units → verification fails; wrong salt → verification fails; round-trip passes.

### Task 3.2 — Network Protocol and Zod Schemas
- Create `/lib/net/protocol.ts` with all `NetMessage` variants and Zod schemas.
- Export `parseNetMessage(raw: unknown): NetMessage` (throws on invalid).
- Export `serializeNetMessage(msg: NetMessage): string`.
- ✓ Unit tests: valid messages parse correctly; invalid messages throw; seq number present; coordinate clamping on `shot` messages.

### Task 3.3 — Transport Interface and PeerJS Implementation
- Create `/lib/net/transport.ts` with `Transport` interface.
- Create `/lib/net/peerjs.ts` with `PeerJSTransport`:
  - `connect(roomCode, role)`: maps code to peer ID `paperwar-${code}`.
  - Retries up to `MAX_CODE_RETRIES` on host collision.
  - Handles disconnect/reconnect events.
  - All incoming messages validated via `parseNetMessage`.
- Create `/lib/net/supabase-stub.ts` with stub that throws `NotImplementedError`.
- ✓ TypeScript compiles. Unit test: stub methods throw. Integration test (manual only, noted in README).

---

## Phase 4: Zustand Stores and Hooks

### Task 4.1 — Game Store
- Create `hooks/useGameStore.ts` using Zustand.
- Wraps `gameReducer`; exposes `gameState`, `dispatch`.
- Integrates autosave (serialize to localStorage on every dispatch, restore on init).
- ✓ Unit test (mocked localStorage): dispatch updates state; autosave writes to storage; init restores saved state.

### Task 4.2 — Settings Store
- Create `hooks/useSettingsStore.ts`: theme, soundEnabled, difficulty, rules, stats.
- Persists all fields to localStorage with version field; safe-parses on load.
- ✓ Unit test: persists and restores; corrupt data defaults gracefully; version mismatch resets.

### Task 4.3 — Net Store
- Create `hooks/useNetStore.ts`: transport instance, connectionStatus, roomCode, peerRole.
- `connect(code, role)` and `disconnect()` actions.
- ✓ TypeScript compiles. Store initializes in "disconnected" state.

### Task 4.4 — useAI Hook
- Create `hooks/useAI.ts`: selects correct `AIStrategy` based on difficulty; handles think delay (700–1500ms); fires shot via `dispatch` after delay.
- ✓ Unit test (fake timers): Easy AI fires after delay; Medium AI fires after delay; delay within bounds.

### Task 4.5 — useResizeObserver Hook
- Create `hooks/useResizeObserver.ts`: observes a ref element; returns `{ width, height }`.
- ✓ Unit test (jsdom): fires callback on resize.

---

## Phase 5: Theme System

### Task 5.1 — Theme Types and CSS Variable Injection
- Create `/lib/themes/types.ts` with `ThemeConfig` type (from design.md §11).
- Create `components/ui/ThemeProvider.tsx` ("use client"): reads theme from settings store; injects CSS variables onto `:root`; provides `useTheme()` context.
- ✓ Unit test: ThemeProvider injects expected CSS variables for each theme; switching theme updates variables.

### Task 5.2 — Notebook Sketch Theme
- Create `/lib/themes/notebook.ts` with full `ThemeConfig`.
- Create SVG unit components in `/components/units/notebook/` for Soldier, Queen, King (ballpoint style, roughness filter in defs).
- Implement hit effect: animated scribble (stroke-dashoffset, 2–3 paths).
- ✓ Theme-completeness test: all required ThemeConfig fields present and typed; unit components render without errors in RTL.

### Task 5.3 — Neon Blueprint Theme
- Create `/lib/themes/blueprint.ts` with full `ThemeConfig`.
- Create wireframe SVG unit components in `/components/units/blueprint/`.
- Implement particle burst hit effect (SVG, ≤ 40 particles, bounded duration).
- ✓ Theme-completeness test passes.

### Task 5.4 — Vintage Parchment Theme
- Create `/lib/themes/parchment.ts` with full `ThemeConfig`.
- Create calligraphic SVG unit components in `/components/units/parchment/`.
- Implement radial burnt-hole effect for King/Queen; splat for Soldier.
- ✓ Theme-completeness test passes.

### Task 5.5 — Theme Completeness Test
- Create `tests/unit/theme-completeness.test.ts`.
- Import all three theme configs; verify every field in `ThemeConfig` is non-null/undefined; verify `cssVars` contains all required variable names; verify unit components exist for all unit types.
- ✓ Test passes for all three themes.

---

## Phase 6: Audio System

### Task 6.1 — Audio Service
- Create `/lib/audio/audioService.ts`:
  - Singleton (initialized lazily on first user gesture).
  - `play(sound: SoundId): void` — no-ops if not initialized or muted.
  - `setMuted(muted: boolean): void`.
  - `setActivePack(packId: SoundPackId): void`.
  - Uses Web Audio API oscillator/buffer for placeholder sounds; real files loaded via fetch.
- Create placeholder packs for each theme in `/lib/audio/packs/`.
- ✓ Unit test (mock AudioContext): play() calls correct oscillator; mute suppresses playback; pack switch updates active sounds.

---

## Phase 7: UI Components — Base

### Task 7.1 — Shared UI Primitives
- Create `components/ui/Button.tsx`: variants (primary, secondary, ghost, danger); 44px minimum height; disabled state.
- Create `components/ui/Modal.tsx`: focus trap, Esc to close, ARIA role="dialog".
- Create `components/ui/Toast.tsx`: toast queue with auto-dismiss; ARIA live="polite".
- Create `components/ui/ErrorBoundary.tsx`: catches render errors; shows fallback.
- Create `components/ui/SettingsDrawer.tsx`: slide-in panel with theme, sound, difficulty controls.
- ✓ RTL tests: Button renders and is focusable; Modal traps focus; Toast announces via live region; ErrorBoundary renders fallback on error.

### Task 7.2 — i18n String Infrastructure
- Create `/lib/i18n.ts`: `t(key: string, vars?: Record<string, string>): string`; loads from a `en.json` strings file.
- Create `public/locales/en.json` with all user-visible strings extracted from component designs.
- ✓ Unit test: known key returns expected string; unknown key returns key as fallback; variable interpolation works.

---

## Phase 8: Main Menu Screen

### Task 8.1 — Main Menu
- Create `components/menu/MainMenu.tsx` ("use client").
- Mode buttons: Local, Vs AI, Online; navigates to appropriate route.
- `DifficultyPicker` (shown when Vs AI selected).
- `ThemeSwitcher` with live preview (renders mini-board with theme CSS vars).
- `RulesPanel`: shot count, queen-takes-2, quadrant-reveal, all-units-win toggles.
- `HowToPlayModal`: step-by-step illustrated instructions.
- Sound toggle icon (Lucide).
- All text via `t()`.
- ✓ RTL test: all buttons render and are accessible; mode selection shows difficulty picker only for AI mode; rules toggles update settings store.

---

## Phase 9: Game Lobby Screen

### Task 9.1 — Online Lobby
- Create `components/lobby/GameLobby.tsx` ("use client").
- Host: generates room code (via NetStore); shows `RoomCodeDisplay` with copy and share-link buttons; deep link `/join/[code]`.
- Guest: input field for code; connects on submit.
- `ConnectionBadge`: shows connecting/connected/reconnecting status.
- Both ready states shown; Start button activates when both ready.
- Error handling: collision retry, invalid code, timeout messages via Toast.
- ✓ RTL test: room code display renders copy button; ready state reflects store; error toast shown on connection failure.

---

## Phase 10: Unit Deployment Screen

### Task 10.1 — Deployment Board
- Create `components/deployment/BoardHalf.tsx` ("use client"): renders the player's half with placed units; pointer-event handlers for tap-to-place and drag-and-drop.
- Create `components/deployment/UnitGhost.tsx`: preview of unit being placed; red tint when position is invalid (calls `isValidPlacement`).
- Create `components/deployment/UnitTray.tsx`: shows unplaced units with tap-to-select.
- Create `components/deployment/UnitDeployment.tsx`: orchestrates deployment screen.
- Randomize button → dispatches `RANDOMIZE_PLACEMENT`.
- Reset button → dispatches `RESET_PLACEMENT`.
- Ready button → active only when all units placed; dispatches `LOCK_LAYOUT`.
- Pass-device privacy screen in local mode.
- ✓ RTL test: unit appears in tray before placement; placed unit disappears from tray; invalid placement shows red ghost; Ready button disabled until all placed; Randomize produces valid placement.

---

## Phase 11: Battlefield Components

### Task 11.1 — Paper Sheet and Halves
- Create `components/battlefield/PaperSheet.tsx` ("use client"): outer container; uses `useResizeObserver` to scale content; sets up perspective for 3D fold.
- Create `components/battlefield/PlayerHalf.tsx`: renders own units (alive/dead) and incoming shot marks.
- Create `components/battlefield/OpponentHalf.tsx`: renders outgoing shot marks and revealed dead units.
- Create `components/battlefield/CenterCrease.tsx`: animated gradient + stitched-fold texture SVG overlay.
- ✓ RTL snapshot test: halves render; units visible on own half; opponent half shows no unit positions until revealed.

### Task 11.2 — Unit and Shot Markers
- Create `components/battlefield/UnitMarker.tsx`: renders the correct theme SVG unit; dead marker (theme-specific); ARIA label.
- Create `components/battlefield/ShotMark.tsx`: renders hit (cross + color) or miss (dot + shape) marker; theme-specific style from `ThemeConfig`; distinguishable by shape for color-blind users.
- ✓ RTL test: hit mark and miss mark both rendered with distinct ARIA labels and distinct shape (not just color).

### Task 11.3 — Aiming Reticle and Loupe
- Create `components/battlefield/AimingReticle.tsx` ("use client"): movable via pointer events; constrained to opponent half; `touch-action: none`; dispatches `AIM` action on move.
- Create `components/battlefield/MagnifierLoupe.tsx`: magnifies the area around the reticle; positioned above touch point; visible only during active drag.
- Keyboard support: arrow keys move reticle by 1/50th of half width; Enter fires.
- ✓ RTL test: reticle responds to pointer events; keyboard moves update AIM position; loupe shown during drag.

### Task 11.4 — Fold Animation Layer
- Create `components/battlefield/FoldAnimationLayer.tsx` ("use client"):
  - Uses Framer Motion `useAnimate`.
  - Sequence from design.md §12 (ink → fold → press+rumble → unfold → reveal).
  - Props: `trigger: boolean`, `heavyHit: boolean`, `onComplete: () => void`, `reducedMotion: boolean`.
  - Skip on tap: `controls.stop()` → snap to end state.
  - Back-face paper texture shown during fold.
  - Shadow grows/recedes.
  - Rumble amplitude scales with `heavyHit`.
- ✓ RTL test (mocked Framer Motion): onComplete called after sequence; reduced motion skips 3D transforms; skip prop calls onComplete immediately.

### Task 11.5 — Battlefield Screen Assembly
- Create `components/battlefield/BattlefieldScreen.tsx` ("use client"):
  - Composes PaperSheet, both halves, CenterCrease, AimingReticle, MagnifierLoupe, FoldAnimationLayer.
  - Shows Turn Banner (whose turn, shot counter).
  - Fire button: visible in Aiming phase; dispatches `FIRE`; disabled during animation phases.
  - Shot Log Drawer: collapsible side panel showing all shots with results.
  - Connects to GameStore; shows TurnControllerOverlay based on phase and mode.
  - ARIA live region for turn/shot announcements.
  - Haptic feedback via `navigator.vibrate` on hit/miss.
- ✓ RTL test: Fire button visible in Aiming; dispatches FIRE on click; live region text updates on phase change.

---

## Phase 12: Overlays and Controllers

### Task 12.1 — Turn Controller Overlay
- Create `components/overlays/TurnControllerOverlay.tsx` ("use client"):
  - "Player X's Turn" banner (shown in TurnHandoff for Pass & Play).
  - "AI is thinking…" spinner (shown during AI think phase).
  - "Waiting for opponent…" (shown during online opponent's turn).
  - Pass-device screen: blank sheet with tap-to-reveal.
- ✓ RTL test: each variant renders with correct text; pass-device screen hides board content until tapped.

### Task 12.2 — Game Over Screen
- Create `components/overlays/GameOverScreen.tsx` ("use client"):
  - Winner banner with theme-specific styling.
  - Full reveal of all units on both halves.
  - Stats: shots fired, accuracy %, turns taken.
  - Rematch button (in online mode: waits for both to accept; 15s timeout).
  - Menu button.
  - Cheat-detected alert (shown if `gameState.cheatDetected`).
- ✓ RTL test: winner text shown; stats calculated correctly; rematch button disabled until accepted in online mode.

### Task 12.3 — Pause Menu
- Create `components/overlays/PauseMenu.tsx`: Resume, Settings (opens SettingsDrawer), Forfeit/Leave, Menu.
- ✓ RTL test: renders on pause trigger; Resume closes it.

---

## Phase 13: Game Mode Screens (Wiring Everything Together)

### Task 13.1 — Local Pass & Play Screen
- Create `app/play/local/page.tsx` ("use client").
- Orchestrates: Deployment (with pass-device screen between players) → Battlefield (with TurnControllerOverlay in pass-device mode) → GameOver.
- Handles phase transitions by reading GameStore phase.
- ✓ Integration test: full game flow compiles and renders to GameOver phase without errors.

### Task 13.2 — Vs AI Screen
- Create `app/play/ai/page.tsx` ("use client").
- Connects `useAI` hook; AI fires automatically after think delay.
- AI placement via `choosePlacement` from the AI strategy.
- ✓ Integration test: AI fires automatically; game reaches GameOver.

### Task 13.3 — Online Screen
- Create `app/play/online/page.tsx` and `app/join/[code]/page.tsx` ("use client").
- Full online flow: Lobby → commitment exchange → Deployment → Battlefield → reveal + verify → GameOver.
- Handles disconnect (waiting overlay, forfeit).
- ✓ TypeScript compiles. Manual integration test noted (two browser tabs).

---

## Phase 14: Responsive Layout and Mobile

### Task 14.1 — Responsive Board Layout
- Update PaperSheet: CSS media query / `useMediaQuery` for portrait vs landscape; halves stack vertically (portrait < 640px) or side-by-side (landscape / ≥ 640px).
- Safe-area insets: `env(safe-area-inset-*)` applied to container padding.
- Prevent double-tap zoom on board: `touch-action: manipulation` on game container.
- Orientation change: board re-measures via ResizeObserver and re-renders without state loss.
- ✓ RTL test: at 400px wide, halves have `flex-direction: column`; at 800px wide, `flex-direction: row`.

### Task 14.2 — Minimum Tap Targets and Keyboard Navigation
- Audit all interactive elements; apply `min-h-[44px] min-w-[44px]` Tailwind classes or CSS.
- Verify Tab order on Battlefield: reticle is focusable; arrow keys move it; Enter fires.
- Focus management: when overlay opens, focus moves to it; when it closes, focus returns.
- ✓ Accessibility audit test (aXe via RTL): no critical violations in MainMenu, Battlefield, and GameOver.

---

## Phase 15: Persistence and Storage

### Task 15.1 — localStorage Module
- Create `/lib/storage/storage.ts`:
  - `saveGameState(state: GameState): void`.
  - `loadGameState(): GameState | null`.
  - `saveSettings(settings: SettingsData): void`.
  - `loadSettings(): SettingsData`.
  - `clearGameState(): void`.
  - Version field (`STORAGE_VERSION = 1`); on version mismatch, returns null/defaults.
  - All reads wrapped in try/catch returning safe defaults.
- ✓ Unit test: save/load round-trip; corrupt JSON returns null; version mismatch returns null; version match restores correctly.

---

## Phase 16: Polish, Effects, and Audio Integration

### Task 16.1 — Theme Hit Effects Integration
- Wire theme hit effects (`HitEffectConfig`) into `ShotMark.tsx` and `UnitMarker.tsx`:
  - Notebook: scribble stroke-dashoffset animation plays on hit.
  - Blueprint: particle burst plays on hit/kill.
  - Parchment: radial ink-blot/burnt-hole plays on King/Queen hit; splat on Soldier.
- All effects respect `prefers-reduced-motion` (fade only).
- ✓ RTL snapshot test: each theme's hit effect component renders without errors; reduced-motion variant renders.

### Task 16.2 — Audio Integration
- Wire `audioService` to game events in `BattlefieldScreen` and `GameOverScreen`:
  - Fire → pen scratch.
  - Hit → hit sting.
  - Miss → miss tick.
  - Win → win jingle.
  - Fold → fold whoosh.
  - Press → thud.
- Audio init on first user gesture (click/tap on any button before game starts).
- ✓ Unit test (mock AudioContext): each game event triggers the correct `play()` call with the correct sound ID.

### Task 16.3 — Lifetime Stats
- Update GameOverScreen to write win/loss to stats in SettingsStore after game ends.
- Display lifetime stats on MainMenu (W/L vs each difficulty, vs human).
- ✓ Unit test: win increments correct counter; loss increments correct counter; stats persist across store re-initializations.

---

## Phase 17: Quality Assurance

### Task 17.1 — Full Test Pass and CI Scripts
- Run all unit tests; fix any failures.
- Run `npm run typecheck`; fix any type errors.
- Run `npm run lint`; fix all warnings and errors.
- Verify all test files from the tests matrix in design.md §14 are present and passing:
  - rules.test.ts, reducer.test.ts, geometry.test.ts, placement.test.ts
  - ai-easy.test.ts, ai-medium.test.ts, ai-hard.test.ts, ai-simulation.test.ts
  - commitment.test.ts, theme-completeness.test.ts
- ✓ `npm run lint && npm run typecheck && npm run test` all exit 0.

### Task 17.2 — Playwright E2E Smoke Test
- Create `tests/e2e/local-game.spec.ts`:
  - Open `localhost:3000`.
  - Click "Local Pass & Play".
  - Click "Randomize" for Player 1, click "Ready".
  - Click "Tap to continue" on privacy screen.
  - Click "Randomize" for Player 2, click "Ready".
  - Play 3 turns by clicking on the opponent half and clicking "Fire".
  - Assert: turn counter incremented 3 times; no console errors.
- ✓ `npm run test:e2e` exits 0.

### Task 17.3 — Lighthouse Audit Check
- Run `next build && next start` and run Lighthouse CLI against mobile preset.
- Document results. If score < 90, identify largest bundle contributors and add dynamic imports / lazy loading.
- ✓ Lighthouse mobile performance ≥ 90.

---

## Phase 18: Documentation and Final Deliverables

### Task 18.1 — README
- Write `README.md` with:
  - Project overview and screenshots placeholder.
  - Setup: `npm install`, `npm run dev`.
  - All scripts: lint, typecheck, test, test:e2e, build.
  - Architecture overview (short, links to spec/design.md).
  - How to add a theme (5-step guide).
  - How to swap the network transport (3-step guide: implement Transport interface, register in NetStore).
  - Vercel deploy steps.
- ✓ README exists and covers all listed sections.

### Task 18.2 — CREDITS File
- Write `CREDITS.md`:
  - Audio placeholder sources (or "procedurally generated via Web Audio API").
  - Any third-party SVG or texture assets used.
  - Open-source library attributions (PeerJS, Framer Motion, etc.) with licenses.
- ✓ File exists.

### Task 18.3 — Final Build Verification
- Run `npm run build`; confirm zero errors.
- Verify all three game modes are playable start-to-finish (manual smoke test checklist in README).
- Verify all three themes display correctly and their hit effects play.
- Verify fold animation plays and is skippable.
- Verify online mode works between two browser tabs (commitment exchange, result computation, reveal + verification).
- ✓ `npm run build` exits 0. All manual smoke checks pass.

---

## Task Dependency Summary

```
0.1 → 0.2 → 0.3
0.3 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7
1.7 → 2.1 → 2.2 → 2.3 → 2.4
1.2 → 3.1 → 3.2 → 3.3
1.7, 3.3 → 4.1 → 4.2 → 4.3 → 4.4 → 4.5
4.1, 4.2 → 5.1 → 5.2 → 5.3 → 5.4 → 5.5
5.1 → 6.1
5.1, 7.1 → 7.2
7.1, 7.2 → 8.1
4.3, 7.1 → 9.1
4.1, 7.1 → 10.1
5.1, 7.1 → 11.1 → 11.2 → 11.3 → 11.4 → 11.5
7.1 → 12.1 → 12.2 → 12.3
10.1, 11.5, 12.1 → 13.1 → 13.2 → 13.3
11.5 → 14.1 → 14.2
4.1, 4.2 → 15.1
5.2, 5.3, 5.4, 11.2 → 16.1
6.1, 11.5 → 16.2
12.2, 4.2 → 16.3
ALL → 17.1 → 17.2 → 17.3
17.3 → 18.1 → 18.2 → 18.3
```
