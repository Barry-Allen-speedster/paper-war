/**
 * Game state machine reducer.
 * Pure function — no side effects, no DOM, no async.
 * Illegal transitions return state unchanged (no throws in production).
 */
import type { GameState, GameAction, PlayerState, PlayerId, GamePhase } from "./types";
import { DEFAULT_CONFIG } from "./config";
import { buildArmy, randomPlacement, moveUnit } from "./placement";
import { computeShotResult, applyShot, applyRulesToArmy, checkWinCondition, buildShot, getSkippedPlayer } from "./rules";
import { createRNG } from "./rng";
import { clamp01 } from "./geometry";

const C = DEFAULT_CONFIG;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePlayer(id: PlayerId): PlayerState {
  return {
    id,
    units: buildArmy(id),
    shots: [],
    isReady: false,
    layoutLocked: false,
  };
}

function getPlayer(state: GameState, id: PlayerId): PlayerState {
  return state.players[id === "p1" ? 0 : 1];
}

function setPlayer(state: GameState, updated: PlayerState): GameState {
  const idx = updated.id === "p1" ? 0 : 1;
  const players = [...state.players] as [PlayerState, PlayerState];
  players[idx] = updated;
  return { ...state, players };
}

function otherPlayer(id: PlayerId): PlayerId {
  return id === "p1" ? "p2" : "p1";
}

function canTransitionTo(from: GamePhase, to: GamePhase): boolean {
  const allowed: Partial<Record<GamePhase, GamePhase[]>> = {
    MainMenu:    ["Lobby", "Setup"],
    Lobby:       ["Setup", "MainMenu"],
    Setup:       ["Aiming"],
    Aiming:      ["Fired"],
    Fired:       ["Folding"],
    Folding:     ["Pressing"],
    Pressing:    ["Unfolding"],
    Unfolding:   ["Resolving"],
    Resolving:   ["TurnHandoff", "GameOver"],
    TurnHandoff: ["Aiming"],
    GameOver:    ["Setup", "MainMenu"],
  };
  return allowed[from]?.includes(to) ?? false;
}

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialState(): GameState {
  return {
    phase: "MainMenu",
    config: {
      mode: "local",
      difficulty: null,
      rules: { ...C.DEFAULT_RULES },
      seed: 1,
    },
    players: [makePlayer("p1"), makePlayer("p2")],
    currentPlayerId: "p1",
    turn: 1,
    shotsRemainingInTurn: 1,
    aimingPos: { x: 0.5, y: 0.5 },
    pendingShot: null,
    winner: null,
    syncError: false,
    revealedKingQuadrant: null,
    skippedTurnPlayerId: null,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const rng = createRNG(action.config.seed);
      const p1 = makePlayer("p1");
      const p2 = makePlayer("p2");
      const rules = action.config.rules;
      // Advance RNG so placement randomization differs from the raw seed
      const derivedSeed = rng.nextInt(1, 2 ** 31 - 1);
      const config = { ...action.config, seed: derivedSeed };

      return {
        ...createInitialState(),
        phase: action.config.mode === "online" ? "Lobby" : "Setup",
        config,
        players: [
          { ...p1, units: applyRulesToArmy(p1.units, rules) },
          { ...p2, units: applyRulesToArmy(p2.units, rules) },
        ],
        shotsRemainingInTurn: rules.shotsPerTurn,
      };
    }

    case "PLACE_UNIT": {
      if (state.phase !== "Setup") return state;
      const player = getPlayer(state, action.playerId);
      if (player.layoutLocked) return state;

      const unitIdx = player.units.findIndex((u) => u.id === action.unitId);
      if (unitIdx === -1) return state;

      const unit = player.units[unitIdx]!;
      const updatedUnit = moveUnit(unit, clamp01(action.pos));
      const updatedUnits = [...player.units];
      updatedUnits[unitIdx] = updatedUnit;

      return setPlayer(state, { ...player, units: updatedUnits });
    }

    case "RANDOMIZE_PLACEMENT": {
      if (state.phase !== "Setup") return state;
      const player = getPlayer(state, action.playerId);
      if (player.layoutLocked) return state;

      const rng = createRNG(state.config.seed + (action.playerId === "p1" ? 0 : 1000));
      try {
        const placed = randomPlacement(player.units, rng);
        return setPlayer(state, { ...player, units: placed });
      } catch {
        return state; // placement failed, keep current state
      }
    }

    case "RESET_PLACEMENT": {
      if (state.phase !== "Setup") return state;
      const player = getPlayer(state, action.playerId);
      if (player.layoutLocked) return state;

      const resetUnits = player.units.map((u) => ({ ...u, pos: { x: 0, y: 0 } }));
      return setPlayer(state, { ...player, units: resetUnits });
    }

    case "LOCK_LAYOUT": {
      if (state.phase !== "Setup") return state;
      const player = getPlayer(state, action.playerId);
      if (player.layoutLocked) return state;

      const updatedPlayer = { ...player, layoutLocked: true, isReady: true };
      const nextState = setPlayer(state, updatedPlayer);

      // Both players locked → start the game
      const p1 = getPlayer(nextState, "p1");
      const p2 = getPlayer(nextState, "p2");
      if (p1.layoutLocked && p2.layoutLocked) {
        return {
          ...nextState,
          phase: "Aiming",
          currentPlayerId: "p1",
          turn: 1,
          shotsRemainingInTurn: nextState.config.rules.shotsPerTurn,
        };
      }
      return nextState;
    }

    case "AIM": {
      if (state.phase !== "Aiming") return state;
      return { ...state, aimingPos: clamp01(action.pos) };
    }

    case "FIRE": {
      if (state.phase !== "Aiming") return state;
      return { ...state, phase: "Fired" };
    }

    case "ANIMATION_FOLDING_START": {
      if (!canTransitionTo(state.phase, "Folding")) return state;
      return { ...state, phase: "Folding" };
    }

    case "ANIMATION_FOLDING_COMPLETE": {
      if (state.phase !== "Folding") return state;
      return { ...state, phase: "Pressing" };
    }

    case "ANIMATION_PRESSING_COMPLETE": {
      if (state.phase !== "Pressing") return state;
      return { ...state, phase: "Unfolding" };
    }

    case "ANIMATION_UNFOLDING_COMPLETE": {
      if (state.phase !== "Unfolding") return state;
      return { ...state, phase: "Resolving" };
    }

    case "RESOLVE_SHOT": {
      if (state.phase !== "Resolving") return state;

      const shot = action.shot;
      const attackerId = state.currentPlayerId;
      const defenderId = otherPlayer(attackerId);
      const attacker = getPlayer(state, attackerId);
      const defender = getPlayer(state, defenderId);

      // Compute result (for local/ai modes; online mode sends result via network)
      const computed = computeShotResult(shot.pos, defender, state.config.rules);
      const resolvedShot = { ...shot, ...computed };

      // Update defender units
      const updatedDefender = applyShot(computed, resolvedShot, defender, state.config.rules);

      // Add shot to attacker's shot history
      const updatedAttacker: PlayerState = {
        ...attacker,
        shots: [...attacker.shots, resolvedShot],
      };

      let nextState = setPlayer(state, updatedDefender);
      nextState = setPlayer(nextState, updatedAttacker);
      nextState = {
        ...nextState,
        pendingShot: resolvedShot,
        revealedKingQuadrant: resolvedShot.revealedQuadrant ?? state.revealedKingQuadrant,
        skippedTurnPlayerId: getSkippedPlayer(computed, defenderId, state.config.rules),
      };

      // Check win condition
      const winner = checkWinCondition(
        getPlayer(nextState, defenderId),
        attackerId,
        state.config.rules
      );

      if (winner) {
        return { ...nextState, phase: "GameOver", winner };
      }

      return { ...nextState, phase: "TurnHandoff" };
    }

    case "END_TURN": {
      if (state.phase !== "TurnHandoff") return state;

      const shotsLeft = state.shotsRemainingInTurn - 1;

      if (shotsLeft > 0) {
        // More shots this turn for the same player
        return {
          ...state,
          phase: "Aiming",
          shotsRemainingInTurn: shotsLeft,
          pendingShot: null,
        };
      }

      // Pass to next player
      const nextPlayer = otherPlayer(state.currentPlayerId);
      const shotsForNextTurn = state.config.rules.shotsPerTurn;

      // queenKillSkipsTurn: if the next player was marked for a skip, skip them
      if (state.skippedTurnPlayerId === nextPlayer) {
        // Skip nextPlayer — pass straight to the player after them (back to current attacker)
        const playerAfterSkip = otherPlayer(nextPlayer);
        return {
          ...state,
          phase: "Aiming",
          currentPlayerId: playerAfterSkip,
          turn: state.turn + 2, // advance by 2 since one turn is skipped
          shotsRemainingInTurn: shotsForNextTurn,
          pendingShot: null,
          skippedTurnPlayerId: null,
        };
      }

      return {
        ...state,
        phase: "Aiming",
        currentPlayerId: nextPlayer,
        turn: state.turn + 1,
        shotsRemainingInTurn: shotsForNextTurn,
        pendingShot: null,
        skippedTurnPlayerId: null,
      };
    }

    case "GAME_OVER": {
      return { ...state, phase: "GameOver", winner: action.winner };
    }

    case "SYNC_ERROR": {
      return { ...state, syncError: true };
    }

    case "REMATCH": {
      if (state.phase !== "GameOver") return state;
      const fresh = createInitialState();
      return {
        ...fresh,
        phase: "Setup",
        config: state.config,
        players: [makePlayer("p1"), makePlayer("p2")],
        shotsRemainingInTurn: state.config.rules.shotsPerTurn,
      };
    }

    case "RETURN_TO_MENU": {
      return createInitialState();
    }

    default: {
      return state;
    }
  }
}
