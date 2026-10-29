/**
 * Core game types for Paper War.
 * v0.2: Removed hidden-info fields (commitment, salt, cheatDetected).
 *       Added syncError for online desync detection.
 *       Shot.pos is now the ATTACKER'S half coords (mirrors to opponent half after fold).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type UnitType = "soldier" | "queen" | "king";

export interface Unit {
  id: string;
  type: UnitType;
  pos: Vec2;
  alive: boolean;
  hitsRemaining: number;
}

export type ShotResult = "hit" | "miss" | "kill" | "waste";

export interface Shot {
  id: string;
  /** Normalized position on the ATTACKER's half. Same (u,v) lands on opponent's half after fold. */
  pos: Vec2;
  by: PlayerId;
  turn: number;
  result: ShotResult;
  hitUnitId?: string;
  killedUnitType?: UnitType;
  revealedQuadrant?: 0 | 1 | 2 | 3;
}

export type PlayerId = "p1" | "p2";

export interface PlayerState {
  id: PlayerId;
  units: Unit[];
  shots: Shot[];
  isReady: boolean;
  layoutLocked: boolean;
}

export type GameMode = "local" | "ai" | "online";
export type Difficulty = "easy" | "medium" | "hard";

export interface RuleConfig {
  shotsPerTurn: number;
  queenTakesTwo: boolean;
  queenKillSkipsTurn: boolean;
  allUnitsWin: boolean;
  showUnitsAfterReady: boolean;
  /** King requires 4 hits to kill instead of 1 */
  kingTakesFour: boolean;
  /** 3 soldier kills in a row (no misses) lets you revive one dead soldier, if your Queen is alive */
  streakRevive: boolean;
}

export interface GameConfig {
  mode: GameMode;
  difficulty: Difficulty | null;
  rules: RuleConfig;
  seed: number;
}

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
  shotsRemainingInTurn: number;
  aimingPos: Vec2;
  pendingShot: Shot | null;
  winner: PlayerId | null;
  syncError: boolean;
  revealedKingQuadrant: 0 | 1 | 2 | 3 | null;
  /** Set when queenKillSkipsTurn rule fires — this player's next turn is skipped */
  skippedTurnPlayerId: PlayerId | null;
  /** Consecutive soldier kills by the current attacker (for streakRevive rule) */
  consecutiveSoldierKills: number;
  /** When streakRevive triggers, the attacker can revive one dead soldier */
  pendingRevivePlayerId: PlayerId | null;
}

export type GameAction =
  | { type: "START_GAME"; config: GameConfig }
  | { type: "PLACE_UNIT"; playerId: PlayerId; unitId: string; pos: Vec2 }
  | { type: "RANDOMIZE_PLACEMENT"; playerId: PlayerId }
  | { type: "RESET_PLACEMENT"; playerId: PlayerId }
  | { type: "LOCK_LAYOUT"; playerId: PlayerId }
  | { type: "SYNC_REMOTE_LAYOUT"; playerId: PlayerId; units: Unit[] }
  | { type: "AIM"; pos: Vec2 }
  | { type: "FIRE" }
  | { type: "ANIMATION_FOLDING_START" }
  | { type: "ANIMATION_FOLDING_COMPLETE" }
  | { type: "ANIMATION_PRESSING_COMPLETE" }
  | { type: "ANIMATION_UNFOLDING_COMPLETE" }
  | { type: "RESOLVE_SHOT"; shot: Shot }
  | { type: "END_TURN" }
  | { type: "GAME_OVER"; winner: PlayerId }
  | { type: "SYNC_ERROR" }
  | { type: "ADVANCE_FROM_LOBBY" }
  | { type: "SYNC_ONLINE_CONFIG"; seed: number; rules: RuleConfig }
  | { type: "REVIVE_SOLDIER"; playerId: PlayerId; unitId: string }
  | { type: "REMATCH" }
  | { type: "RETURN_TO_MENU" };
