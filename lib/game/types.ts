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
  shotsPerTurn: number;       // 1..3 — how many shots each player fires per turn
  queenTakesTwo: boolean;     // Queen requires 2 hits to kill
  queenKillSkipsTurn: boolean;// Killing opponent's Queen skips their next turn
  allUnitsWin: boolean;       // Must destroy ALL units to win (not just King)
  showUnitsAfterReady: boolean;
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
}

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
  | { type: "SYNC_ERROR" }
  | { type: "REMATCH" }
  | { type: "RETURN_TO_MENU" };
