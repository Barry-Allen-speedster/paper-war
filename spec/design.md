# Paper War — Design Document

**Version:** 0.1 (pre-implementation)  
**Date:** 2026-10-26  
**Status:** Awaiting approval

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App Router  (SSR shell only — game is all client)  │
│                                                             │
│  /app                                                       │
│   ├── page.tsx             ← MainMenu route (/)            │
│   ├── play/                                                 │
│   │    ├── local/page.tsx  ← Pass & Play                   │
│   │    ├── ai/page.tsx     ← Vs AI                         │
│   │    └── online/page.tsx ← Online host/join              │
│   └── join/[code]/page.tsx ← Deep-link guest entry         │
│                                                             │
│  All game UI components are "use client"                    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Zustand Store  (GameStore)                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  GameState (immutable snapshot per dispatch)           │ │
│  │  Actions dispatched through gameReducer                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Slice: settingsSlice (theme, sound, difficulty, stats)     │
│  Slice: netSlice (connection status, peer)                  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│  /lib — Pure, framework-free modules                        │
│                                                             │
│  game/                                                      │
│   ├── types.ts        — all core types & discriminated unions│
│   ├── config.ts       — DEFAULT_CONFIG (all magic numbers)  │
│   ├── reducer.ts      — gameReducer(state, action): state   │
│   ├── rules.ts        — hit detection, win check           │
│   ├── geometry.ts     — Vec2 ops, ref↔normalized, distance  │
│   ├── placement.ts    — validate placement, random placement│
│   └── rng.ts          — seeded RNG (mulberry32)             │
│                                                             │
│  ai/                                                        │
│   ├── easy.ts         — EasyAI: AIStrategy                  │
│   ├── medium.ts       — MediumAI: AIStrategy                │
│   ├── hard.ts         — HardAI: AIStrategy (heatmap)        │
│   └── heatmap.ts      — HeatmapModel (pure functions)       │
│                                                             │
│  net/                                                       │
│   ├── transport.ts    — Transport interface + types         │
│   ├── peerjs.ts       — PeerJSTransport implementation      │
│   ├── supabase-stub.ts— SupabaseStub: Transport             │
│   ├── protocol.ts     — NetMessage types + Zod schemas      │
│   └── commitment.ts   — SHA-256 commit/reveal/verify        │
│                                                             │
│  themes/                                                    │
│   ├── types.ts        — ThemeConfig type                    │
│   ├── notebook.ts     — Notebook Sketch theme config        │
│   ├── blueprint.ts    — Neon Blueprint theme config         │
│   └── parchment.ts    — Vintage Parchment theme config      │
│                                                             │
│  audio/                                                     │
│   └── audioService.ts — Web Audio API wrapper              │
│                                                             │
│  storage/                                                   │
│   └── storage.ts      — localStorage wrapper with versioning│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Type Definitions

```typescript
// /lib/game/types.ts

/** Normalized coordinate within a player half (0..1 on each axis) */
export interface Vec2 {
  x: number; // 0..1
  y: number; // 0..1
}

export type UnitType = "soldier" | "queen" | "king";

export interface Unit {
  id: string;         // e.g. "p1-soldier-0"
  type: UnitType;
  /** Normalized position within the player's half */
  pos: Vec2;
  alive: boolean;
  /** How many more hits before death (normally 1; queen can be 2) */
  hitsRemaining: number;
}

export type ShotResult = "hit" | "miss" | "kill" | "waste";

export interface Shot {
  id: string;
  /** Normalized position within the TARGET player's half */
  pos: Vec2;
  /** Which player fired ("p1" | "p2") */
  by: PlayerId;
  turn: number;
  result: ShotResult;
  /** Set when result is "hit" or "kill" */
  hitUnitId?: string;
  /** Set when result is "kill" and unit was queen, used for quadrant reveal */
  killedUnitType?: UnitType;
}

export type PlayerId = "p1" | "p2";

export interface PlayerState {
  id: PlayerId;
  units: Unit[];
  shots: Shot[];        // shots fired BY this player
  isReady: boolean;
  commitment?: string;  // SHA-256 hash (online only)
  salt?: string;        // revealed at game over
  /** True once layout has been locked in Setup */
  layoutLocked: boolean;
}

export type GameMode = "local" | "ai" | "online";
export type Difficulty = "easy" | "medium" | "hard";
export type Orientation = "portrait" | "landscape";

export interface RuleConfig {
  shotsPerTurn: number;           // 1..3
  queenTakesTwo: boolean;
  queenRevealKingQuadrant: boolean;
  allUnitsWin: boolean;
}

export interface GameConfig {
  mode: GameMode;
  difficulty: Difficulty | null;  // null unless mode === "ai"
  rules: RuleConfig;
  seed: number;
}

// ─── State Machine ───────────────────────────────────────────

export type GamePhase =
  | "MainMenu"
  | "Lobby"
  | "Setup"
  | "Aiming"
  | "Fired"
  | "Folding"
  | "Pressing"
  | "Unfolding"
  | "Resolving"
  | "TurnHandoff"
  | "GameOver";

export interface GameState {
  phase: GamePhase;
  config: GameConfig;
  players: [PlayerState, PlayerState];
  currentPlayerId: PlayerId;
  turn: number;
  /** Shots remaining in the current turn (counts down from shotsPerTurn) */
  shotsRemainingInTurn: number;
  /** The in-flight shot during the animation phases */
  pendingShot: Shot | null;
  /** Set to "p1" or "p2" when game ends */
  winner: PlayerId | null;
  /** True if commitment verification failed at reveal */
  cheatDetected: boolean;
  /** King quadrant revealed: 0=TL, 1=TR, 2=BL, 3=BR, null=not revealed */
  revealedKingQuadrant: 0 | 1 | 2 | 3 | null;
}

// ─── Actions (discriminated union) ───────────────────────────

export type GameAction =
  | { type: "START_GAME"; config: GameConfig }
  | { type: "PLACE_UNIT"; playerId: PlayerId; unitId: string; pos: Vec2 }
  | { type: "RANDOMIZE_PLACEMENT"; playerId: PlayerId }
  | { type: "RESET_PLACEMENT"; playerId: PlayerId }
  | { type: "LOCK_LAYOUT"; playerId: PlayerId }
  | { type: "AIM"; pos: Vec2 }
  | { type: "FIRE" }
  | { type: "ANIMATION_FOLDING_START" }
  | { type: "ANIMATION_FOLDING_COMPLETE" }
  | { type: "ANIMATION_PRESSING_COMPLETE" }
  | { type: "ANIMATION_UNFOLDING_COMPLETE" }
  | { type: "RESOLVE_SHOT"; shot: Shot }
  | { type: "END_TURN" }
  | { type: "GAME_OVER"; winner: PlayerId }
  | { type: "REVEAL_LAYOUT"; playerId: PlayerId; units: Unit[]; salt: string }
  | { type: "SET_COMMITMENT"; playerId: PlayerId; commitment: string }
  | { type: "CHEAT_DETECTED" }
  | { type: "REMATCH" }
  | { type: "RETURN_TO_MENU" };
```

---

## 3. Network Protocol Types

```typescript
// /lib/net/protocol.ts (Zod schemas abbreviated for clarity)

export type NetMessage =
  | { type: "hello"; version: string; seq: number }
  | { type: "ready"; commitment: string; seq: number }
  | { type: "shot"; pos: Vec2; shotId: string; seq: number }
  | { type: "shotResult"; shotId: string; result: ShotResult;
      unitType?: UnitType; quadrant?: 0|1|2|3; seq: number }
  | { type: "reveal"; units: Unit[]; salt: string; seq: number }
  | { type: "rematch"; seq: number }
  | { type: "ping"; seq: number }
  | { type: "pong"; seq: number }
  | { type: "forfeit"; seq: number };
```

---

## 4. Finite State Machine Diagram

```
                    START_GAME
  ┌──────────┐  ──────────────────► ┌───────────┐
  │ MainMenu │                      │   Lobby   │  (online only)
  └──────────┘ ◄── RETURN_TO_MENU   └─────┬─────┘
       │                                  │ both connected
       │ START_GAME (local/ai)            ▼
       └──────────────────────────► ┌───────────┐
                                    │   Setup   │  both players deploy
                                    └─────┬─────┘
                                          │ LOCK_LAYOUT ×2
                                          ▼
                                    ┌─────────────┐
                                    │   Aiming    │ ◄─────────────┐
                                    └──────┬──────┘               │
                                           │ FIRE                  │
                                           ▼                      │
                                    ┌─────────────┐               │
                                    │    Fired    │               │
                                    └──────┬──────┘               │
                                           │                      │
                                           ▼                      │
                                    ┌─────────────┐               │
                                    │   Folding   │               │
                                    └──────┬──────┘               │
                                           │                      │
                                           ▼                      │
                                    ┌─────────────┐               │
                                    │  Pressing   │               │
                                    └──────┬──────┘               │
                                           │                      │
                                           ▼                      │
                                    ┌─────────────┐               │
                                    │  Unfolding  │               │
                                    └──────┬──────┘               │
                                           │                      │
                                           ▼                      │
                                    ┌─────────────┐               │
                                    │  Resolving  │               │
                                    └──────┬──────┘               │
                                           │                      │
                               ┌───────────┴──────────┐          │
                               │ win?                 │ no win   │
                               ▼                      ▼          │
                         ┌──────────┐          ┌───────────────┐ │
                         │ GameOver │          │ TurnHandoff   │─┘
                         └──────────┘          └───────────────┘
```

---

## 5. Component Tree

```
App (layout.tsx)
├── ThemeProvider          ← injects CSS variables from ThemeConfig
├── AudioProvider          ← lazy Web Audio context
└── Routes
    ├── MainMenuScreen
    │   ├── ModeButtons
    │   ├── DifficultyPicker
    │   ├── ThemeSwitcher (live preview)
    │   ├── RulesPanel
    │   ├── HowToPlayModal
    │   └── SettingsDrawer
    │
    ├── GameLobbyScreen
    │   ├── RoomCodeDisplay
    │   ├── ShareLinkButton
    │   ├── ConnectionBadge
    │   └── ReadyControls
    │
    ├── UnitDeploymentScreen
    │   ├── BoardHalf (player's own half, interactive)
    │   │   ├── UnitGhost (drag preview)
    │   │   └── PlacedUnit[]
    │   ├── UnitTray
    │   ├── RandomizeButton
    │   ├── ResetButton
    │   └── ReadyButton
    │
    ├── BattlefieldScreen
    │   ├── PaperSheet
    │   │   ├── PlayerHalf (own — shows units)
    │   │   │   ├── UnitMarker[]
    │   │   │   └── ShotMark[] (incoming shots)
    │   │   ├── CenterCrease (animated gradient + texture)
    │   │   └── OpponentHalf
    │   │       ├── ShotMark[] (outgoing — miss/hit markers)
    │   │       └── DeadUnitReveal[]
    │   ├── AimingReticle (movable overlay)
    │   ├── MagnifierLoupe
    │   ├── FoldAnimationLayer (Framer Motion)
    │   ├── TurnBanner
    │   ├── ShotCounter
    │   └── ShotLogDrawer
    │
    ├── TurnControllerOverlay
    │   ├── PlayerTurnBanner
    │   ├── AIThinkingIndicator
    │   ├── WaitingForOpponentBanner
    │   └── PassDeviceScreen
    │
    └── GameOverScreen
        ├── WinnerBanner
        ├── FullRevealBoard
        ├── StatsPanel
        ├── RematchButton
        └── MenuButton
```

---

## 6. Zustand Store Design

```
GameStore
 ├── gameState: GameState
 ├── dispatch(action: GameAction): void
 ├── aimingPos: Vec2                 ← ephemeral, not persisted
 │
SettingsStore
 ├── theme: ThemeId
 ├── soundEnabled: boolean
 ├── difficulty: Difficulty
 ├── rules: RuleConfig
 ├── stats: LifetimeStats
 │
NetStore
 ├── transport: Transport | null
 ├── connectionStatus: "disconnected" | "connecting" | "connected" | "reconnecting"
 ├── roomCode: string | null
 ├── peerRole: "host" | "guest" | null
```

`SettingsStore` and `NetStore` are separate from `GameStore` so that settings changes don't trigger game re-renders and the network layer can be independently managed.

---

## 7. Coordinate System

All unit positions and shot positions are stored as **normalized Vec2** (each axis 0..1 within the player's half).

Conversion to pixels happens only at render time:

```
refX = normalizedX * REF_SIZE          // REF_SIZE = 1000
pixelX = (refX / REF_SIZE) * halfWidthPx
```

Hit detection, placement validation, and AI logic all operate in the 1000×1000 reference space.

The two functions that bridge spaces live exclusively in `/lib/game/geometry.ts`:

```typescript
toRef(v: Vec2): Vec2    // Vec2 (0..1) → Vec2 (0..1000)
fromRef(v: Vec2): Vec2  // Vec2 (0..1000) → Vec2 (0..1)
```

---

## 8. Placement Validation Algorithm

```
Input: unit (type, proposedPos), existingUnits[], config

1. Convert proposedPos to reference space → posRef
2. Check margin constraints:
   - posRef.x ≥ EDGE_MARGIN
   - posRef.x ≤ REF_SIZE - EDGE_MARGIN
   - posRef.y ≥ CREASE_MARGIN   (crease is at y=0 of the half)
   - posRef.y ≤ REF_SIZE - EDGE_MARGIN
3. For each existing unit E:
   - Compute dist = distance(posRef, toRef(E.pos))
   - If dist < HIT_RADIUS[unit.type] + HIT_RADIUS[E.type] + 6 → INVALID (overlap)
4. Return VALID
```

---

## 9. AI Strategy Interface

```typescript
// /lib/ai/types.ts

export interface AIView {
  /** Shots this AI has fired (with results) */
  shotHistory: Shot[];
  /** Dead enemy units (positions revealed after kill) */
  revealedUnits: Unit[];
  /** All misses (positions the AI knows are clear) */
  missPositions: Vec2[];
  /** Config (for reference space constants) */
  config: GameConfig;
  /** Seeded RNG instance */
  rng: RNG;
}

export interface AIStrategy {
  chooseShot(view: AIView): Vec2;
  choosePlacement(rng: RNG, config: GameConfig): Unit[];
}
```

---

## 10. Transport Interface

```typescript
// /lib/net/transport.ts

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface Transport {
  connect(roomCode: string, role: "host" | "guest"): Promise<void>;
  send(message: NetMessage): void;
  onMessage(handler: (message: NetMessage) => void): () => void; // returns unsubscribe
  onStatus(handler: (status: ConnectionStatus) => void): () => void;
  disconnect(): void;
}
```

---

## 11. Theme System

```typescript
// /lib/themes/types.ts

export type ThemeId = "notebook" | "blueprint" | "parchment";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  /** CSS variable map injected into :root */
  cssVars: Record<string, string>;
  /** Font family name (next/font key) */
  fontFamily: string;
  /** SVG component factory for each unit type */
  unitComponents: Record<UnitType, React.ComponentType<UnitSVGProps>>;
  /** Hit effect config */
  hitEffect: HitEffectConfig;
  /** Miss mark style descriptor */
  missMark: MissMarkConfig;
  /** Shot dot style */
  shotDot: ShotDotConfig;
  /** Crease style (CSS class name or descriptor) */
  crease: CreaseConfig;
  /** Sound pack ID */
  soundPack: SoundPackId;
}
```

Adding a theme requires:
1. Create `/lib/themes/[name].ts` implementing `ThemeConfig`.
2. Create SVG unit components in `/components/units/[theme]/`.
3. Create `/lib/audio/packs/[name].ts` implementing `SoundPack`.
4. Register in `/lib/themes/index.ts`.

---

## 12. Fold Animation Architecture

The fold animation is driven by Framer Motion's `useAnimate` hook inside `FoldAnimationLayer`. It is a client component that receives a `foldTrigger` prop (set when phase transitions to `Folding`) and an `onComplete` callback.

Animation phases (Framer Motion sequence):

```
Phase 1 — "ink" (0ms):
  Ink dot appears on attacker's half (opacity 0→1, scale 0→1, 60ms)

Phase 2 — "fold" (60ms–660ms):
  Attacker's half:
    rotateY: 0deg → -180deg
    easing: easeInOut
    duration: 600ms
  Shadow: opacity 0 → 0.4 (peaks at 300ms) → 0

Phase 3 — "press" (660ms–820ms):
  Board scale: 1 → 0.97 → 1 (80ms each)
  Camera rumble: randomized x/y/rotate keyframes
    amplitude: scaled by heavyHit flag (0.3 = light, 1.0 = king kill)

Phase 4 — "unfold" (820ms–1420ms):
  Attacker's half:
    rotateY: -180deg → 0deg
    duration: 600ms

Phase 5 — "reveal" (1420ms–1600ms):
  Ink dot on opponent's half: opacity 0→1 with radial blur spread
  Hit/miss effect begins
```

`prefers-reduced-motion` disables phases 2–4; the ink dot crossfades directly.

Skip: tapping the board during animation calls `controls.stop()` and snaps all animated values to their final state.

---

## 8. Online Protocol (v0.2 — Shared Deterministic State)

Because nothing is secret, both clients maintain identical state. Only the shot needs to be transmitted.

```
HOST (Player 1)                    GUEST (Player 2)
     │                                   │
     │── hello ──────────────────────► │
     │◄─ hello ──────────────────────── │
     │                                   │
  [both deploy units, tap Ready]         │
     │── ready(skinId, inkColor) ──────► │
     │◄─ ready(skinId, inkColor) ──────── │
     │                                   │
  [turn begins, host aims on OWN half]   │
     │── shot(pos, shotId, seq) ───────► │
     │   (BOTH compute result locally)   │
     │── stateHash(seq, hash) ─────────► │
     │◄─ stateHash(seq, hash) ────────── │
     │   (show desync dialog if mismatch)│
     │                                   │
  [turn passes to guest]                 │
```

### Protocol messages (v0.2)

```typescript
type NetMessage =
  | { type: "hello";     version: string; seq: number }
  | { type: "ready";     skinId: string; inkColor: string; seq: number }
  | { type: "shot";      pos: Vec2; shotId: string; seq: number }
  | { type: "stateHash"; seq: number; hash: string }
  | { type: "rematch";   seq: number }
  | { type: "ping";      seq: number }
  | { type: "pong";      seq: number }
  | { type: "forfeit";   seq: number }
```

**Removed:** `ready(commitment)`, `shotResult`, `reveal` — no hidden information to protect.

**State hash:** `SHA-256(JSON.stringify(gameState.players[0].shots.concat(gameState.players[1].shots)))`

---

```
HOST (Player 1)                    GUEST (Player 2)
     │                                   │
     │── hello ──────────────────────► │
     │◄─ hello ──────────────────────── │
     │                                   │
  [both deploy units locally]            │
     │                                   │
     │── ready(commitment_H) ──────────► │
     │◄─ ready(commitment_G) ────────── │
     │                                   │
     │  [turn begins, host aims]         │
     │── shot(pos, shotId) ───────────► │
     │         (guest computes locally)  │
     │◄─ shotResult(result, type) ────── │
     │                                   │
  [animation plays, turn passes]         │
     │                                   │
     │◄─ shot(pos, shotId) ──────────── │
     │         (host computes locally)   │
     │── shotResult(result, type) ─────► │
     │                                   │
  [game ends]                            │
     │── reveal(units, salt) ──────────► │
     │◄─ reveal(units, salt) ────────── │
     │                                   │
  [both verify commitments]              │
```

Commitment format:
```
commitment = SHA-256(JSON.stringify(sortedUnits) + "|" + salt)
salt = 32 random hex chars
```

`sortedUnits` = units sorted by `id` to ensure deterministic JSON.

---

## 14. Directory Structure (Final)

```
paper-war/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      ← /
│   ├── play/
│   │   ├── local/page.tsx
│   │   ├── ai/page.tsx
│   │   └── online/page.tsx
│   └── join/[code]/page.tsx
│
├── components/
│   ├── menu/
│   │   ├── MainMenu.tsx
│   │   ├── DifficultyPicker.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   ├── RulesPanel.tsx
│   │   └── HowToPlayModal.tsx
│   ├── lobby/
│   │   ├── GameLobby.tsx
│   │   ├── RoomCodeDisplay.tsx
│   │   └── ConnectionBadge.tsx
│   ├── deployment/
│   │   ├── UnitDeployment.tsx
│   │   ├── UnitTray.tsx
│   │   ├── BoardHalf.tsx
│   │   └── UnitGhost.tsx
│   ├── battlefield/
│   │   ├── BattlefieldScreen.tsx
│   │   ├── PaperSheet.tsx
│   │   ├── PlayerHalf.tsx
│   │   ├── OpponentHalf.tsx
│   │   ├── CenterCrease.tsx
│   │   ├── AimingReticle.tsx
│   │   ├── MagnifierLoupe.tsx
│   │   ├── FoldAnimationLayer.tsx
│   │   ├── ShotMark.tsx
│   │   ├── UnitMarker.tsx
│   │   └── ShotLogDrawer.tsx
│   ├── overlays/
│   │   ├── TurnControllerOverlay.tsx
│   │   ├── PassDeviceScreen.tsx
│   │   ├── GameOverScreen.tsx
│   │   └── PauseMenu.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Toast.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── SettingsDrawer.tsx
│   │   └── Modal.tsx
│   └── units/
│       ├── notebook/          ← SVG unit components per theme
│       ├── blueprint/
│       └── parchment/
│
├── lib/
│   ├── game/
│   │   ├── types.ts
│   │   ├── config.ts
│   │   ├── reducer.ts
│   │   ├── rules.ts
│   │   ├── geometry.ts
│   │   ├── placement.ts
│   │   └── rng.ts
│   ├── ai/
│   │   ├── types.ts
│   │   ├── easy.ts
│   │   ├── medium.ts
│   │   ├── hard.ts
│   │   └── heatmap.ts
│   ├── net/
│   │   ├── transport.ts
│   │   ├── peerjs.ts
│   │   ├── supabase-stub.ts
│   │   ├── protocol.ts
│   │   └── commitment.ts
│   ├── themes/
│   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── notebook.ts
│   │   ├── blueprint.ts
│   │   └── parchment.ts
│   ├── audio/
│   │   ├── audioService.ts
│   │   └── packs/
│   │       ├── notebook.ts
│   │       ├── blueprint.ts
│   │       └── parchment.ts
│   └── storage/
│       └── storage.ts
│
├── hooks/
│   ├── useGameStore.ts
│   ├── useSettingsStore.ts
│   ├── useNetStore.ts
│   ├── useTheme.ts
│   ├── useAI.ts
│   └── useResizeObserver.ts
│
├── styles/
│   └── globals.css
│
├── tests/
│   ├── unit/
│   │   ├── rules.test.ts
│   │   ├── reducer.test.ts
│   │   ├── geometry.test.ts
│   │   ├── placement.test.ts
│   │   ├── ai-easy.test.ts
│   │   ├── ai-medium.test.ts
│   │   ├── ai-hard.test.ts
│   │   ├── ai-simulation.test.ts
│   │   ├── commitment.test.ts
│   │   └── theme-completeness.test.ts
│   ├── component/
│   │   ├── MainMenu.test.tsx
│   │   ├── UnitDeployment.test.tsx
│   │   └── BattlefieldScreen.test.tsx
│   └── e2e/
│       └── local-game.spec.ts
│
├── public/
│   └── (static assets, theme textures)
│
├── .kiro/
│   └── steering/
│       ├── product.md
│       ├── tech.md
│       └── structure.md
│
├── CREDITS.md
├── README.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 15. Config File (Single Source of Truth)

All game constants live in `/lib/game/config.ts`:

```typescript
export const DEFAULT_CONFIG = {
  // Board
  REF_SIZE: 1000,
  EDGE_MARGIN: 30,
  CREASE_MARGIN: 30,

  // Unit hit radii (reference space)
  HIT_RADIUS: { soldier: 18, queen: 22, king: 26 } as Record<UnitType, number>,

  // Shot
  SHOT_RADIUS: 8,
  MIN_UNIT_SPACING: 6,

  // Army composition
  ARMY: { soldier: 5, queen: 1, king: 1 } as Record<UnitType, number>,

  // AI
  HARD_AI_GRID: 50,                // 50×50 heatmap
  HARD_AI_EDGE_WEIGHT: 0.3,        // prior weight for edge/crease cells
  MEDIUM_AI_HIT_RADIUS_REF: 30,    // search radius after hit
  MEDIUM_AI_HIT_TURNS: 2,          // turns to hunt after a hit
  AI_THINK_MIN_MS: 700,
  AI_THINK_MAX_MS: 1500,

  // Network
  MAX_CODE_RETRIES: 5,
  RECONNECT_WINDOW_MS: 30_000,
  REMATCH_TIMEOUT_MS: 15_000,

  // Animation (ms)
  ANIM_INK_MS: 60,
  ANIM_FOLD_MS: 600,
  ANIM_PRESS_MS: 160,
  ANIM_UNFOLD_MS: 600,
  ANIM_REVEAL_MS: 180,
  ANIM_TOTAL_MS: 1600,

  // Rules defaults
  DEFAULT_RULES: {
    shotsPerTurn: 1,
    queenTakesTwo: false,
    queenRevealKingQuadrant: false,
    allUnitsWin: false,
  },
} as const;
```

---

## 16. Key Technical Decisions and Justifications

| Decision | Rationale |
|---|---|
| Zustand over useReducer+Context | Zustand gives fine-grained subscription — components re-render only when their slice changes. Context re-renders the whole subtree. With complex game state, this matters for the 60fps target. |
| PeerJS (no backend) | Zero server cost for launch. The Transport interface ensures this is swappable without touching game logic. |
| Commitment protocol (defender computes) | Required for hidden information. The attacker cannot know the result until the defender reports it. SHA-256 commitment ensures the defender cannot change their layout mid-game. |
| Normalized coordinates (0..1) | Identical game behavior across all screen sizes and between two different devices online. Pixel sizes exist only in CSS/render. |
| Seeded RNG (mulberry32) | Enables deterministic test scenarios and reproducible bug reports. No dependency on Math.random() in game logic. |
| Pure /lib functions | Framework-free = fast Vitest execution, no jsdom for logic tests. |
| Single config.ts | All magic numbers in one place makes balancing (hit radii, margins, AI parameters) a single-file edit. |
| Framer Motion for fold | Production-proven for complex animation sequences. `useAnimate` gives imperative control needed for the skip-on-tap behavior. |
| CSS variables for themes | Switching themes is a single DOM update (change CSS variables on `:root`). No re-render cascade. |
