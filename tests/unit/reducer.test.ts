import { describe, it, expect } from "vitest";
import { gameReducer, createInitialState } from "@lib/game/reducer";
import { buildArmy, randomPlacement } from "@lib/game/placement";
import { computeShotResult, buildShot } from "@lib/game/rules";
import { createRNG } from "@lib/game/rng";
import type { GameConfig, GameState } from "@lib/game/types";
import { DEFAULT_CONFIG } from "@lib/game/config";

const C = DEFAULT_CONFIG;

const defaultConfig: GameConfig = {
  mode: "local",
  difficulty: null,
  rules: { ...C.DEFAULT_RULES },
  seed: 42,
};

function startedState(): GameState {
  return gameReducer(createInitialState(), { type: "START_GAME", config: defaultConfig });
}

function fullyDeployedState(): GameState {
  let s = startedState();
  s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p1" });
  s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p2" });
  s = gameReducer(s, { type: "LOCK_LAYOUT", playerId: "p1" });
  s = gameReducer(s, { type: "LOCK_LAYOUT", playerId: "p2" });
  return s;
}

describe("reducer", () => {
  describe("illegal transitions", () => {
    it("AIM in MainMenu is a no-op", () => {
      const s = createInitialState();
      const next = gameReducer(s, { type: "AIM", pos: { x: 0.5, y: 0.5 } });
      expect(next.phase).toBe("MainMenu");
      expect(next).toBe(s); // same reference = no change
    });

    it("FIRE in Setup is a no-op", () => {
      const s = startedState();
      const next = gameReducer(s, { type: "FIRE" });
      expect(next.phase).toBe("Setup");
    });

    it("LOCK_LAYOUT twice is a no-op second time", () => {
      let s = startedState();
      s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p1" });
      s = gameReducer(s, { type: "LOCK_LAYOUT", playerId: "p1" });
      const before = s.players[0].layoutLocked;
      const next = gameReducer(s, { type: "LOCK_LAYOUT", playerId: "p1" });
      expect(before).toBe(true);
      expect(next.players[0].layoutLocked).toBe(true);
    });
  });

  describe("START_GAME", () => {
    it("transitions MainMenu → Setup for local", () => {
      const s = startedState();
      expect(s.phase).toBe("Setup");
    });

    it("transitions MainMenu → Lobby for online", () => {
      const s = gameReducer(createInitialState(), {
        type: "START_GAME",
        config: { ...defaultConfig, mode: "online" },
      });
      expect(s.phase).toBe("Lobby");
    });

    it("initializes shotsRemainingInTurn from rules", () => {
      const s = gameReducer(createInitialState(), {
        type: "START_GAME",
        config: { ...defaultConfig, rules: { ...C.DEFAULT_RULES, shotsPerTurn: 3 } },
      });
      expect(s.shotsRemainingInTurn).toBe(3);
    });

    it("builds the configured army for local play", () => {
      const rules = { ...C.DEFAULT_RULES, soldierCount: 8, bomberEnabled: true };
      const s = gameReducer(createInitialState(), {
        type: "START_GAME",
        config: { ...defaultConfig, rules },
      });
      expect(s.players[0].units.filter((unit) => unit.type === "soldier")).toHaveLength(8);
      expect(s.players[0].units.filter((unit) => unit.type === "bomber")).toHaveLength(1);
    });

    it("uses the host army options for both online players", () => {
      let s = gameReducer(createInitialState(), {
        type: "START_GAME",
        config: { ...defaultConfig, mode: "online" },
      });
      s = gameReducer(s, {
        type: "SYNC_ONLINE_CONFIG",
        seed: 123,
        rules: { ...C.DEFAULT_RULES, soldierCount: 7, bomberEnabled: true },
      });
      for (const player of s.players) {
        expect(player.units.filter((unit) => unit.type === "soldier")).toHaveLength(7);
        expect(player.units.filter((unit) => unit.type === "bomber")).toHaveLength(1);
      }
      expect(s.config.seed).toBe(123);
    });
  });

  describe("online rematch", () => {
    it("restarts with the match rules and multi-hit unit health", () => {
      const rules = {
        ...C.DEFAULT_RULES,
        queenTakesTwo: true,
        kingTakesFour: true,
        shotsPerTurn: 2,
      };
      let s = gameReducer(createInitialState(), {
        type: "START_GAME",
        config: { ...defaultConfig, mode: "online", rules },
      });
      s = gameReducer(s, { type: "GAME_OVER", winner: "p1" });
      s = gameReducer(s, { type: "REMATCH" });

      expect(s.phase).toBe("Setup");
      expect(s.config.rules).toEqual(rules);
      expect(s.shotsRemainingInTurn).toBe(2);
      expect(s.players[0].units.find((unit) => unit.type === "queen")?.hitsRemaining).toBe(2);
      expect(s.players[1].units.find((unit) => unit.type === "king")?.hitsRemaining).toBe(4);
    });
  });

  describe("deployment", () => {
    it("LOCK_LAYOUT by both players → Aiming", () => {
      const s = fullyDeployedState();
      expect(s.phase).toBe("Aiming");
    });

    it("RANDOMIZE_PLACEMENT sets valid positions", () => {
      let s = startedState();
      s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p1" });
      const units = s.players[0].units;
      for (const u of units) {
        expect(u.pos.x).toBeGreaterThan(0);
        expect(u.pos.y).toBeGreaterThan(0);
      }
    });

    it("RESET_PLACEMENT returns units to origin", () => {
      let s = startedState();
      s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p1" });
      s = gameReducer(s, { type: "RESET_PLACEMENT", playerId: "p1" });
      const units = s.players[0].units;
      for (const u of units) {
        expect(u.pos.x).toBe(0);
        expect(u.pos.y).toBe(0);
      }
    });
  });

  describe("turn loop", () => {
    it("animation phases transition correctly", () => {
      let s = fullyDeployedState();
      expect(s.phase).toBe("Aiming");

      s = gameReducer(s, { type: "AIM", pos: { x: 0.5, y: 0.5 } });
      expect(s.phase).toBe("Aiming");

      s = gameReducer(s, { type: "FIRE" });
      expect(s.phase).toBe("Fired");

      s = gameReducer(s, { type: "ANIMATION_FOLDING_START" });
      expect(s.phase).toBe("Folding");

      s = gameReducer(s, { type: "ANIMATION_FOLDING_COMPLETE" });
      expect(s.phase).toBe("Pressing");

      s = gameReducer(s, { type: "ANIMATION_PRESSING_COMPLETE" });
      expect(s.phase).toBe("Unfolding");

      s = gameReducer(s, { type: "ANIMATION_UNFOLDING_COMPLETE" });
      expect(s.phase).toBe("Resolving");
    });

    it("RESOLVE_SHOT with miss → TurnHandoff", () => {
      let s = fullyDeployedState();
      s = gameReducer(s, { type: "AIM", pos: { x: 0.5, y: 0.5 } });
      s = gameReducer(s, { type: "FIRE" });
      s = gameReducer(s, { type: "ANIMATION_FOLDING_START" });
      s = gameReducer(s, { type: "ANIMATION_FOLDING_COMPLETE" });
      s = gameReducer(s, { type: "ANIMATION_PRESSING_COMPLETE" });
      s = gameReducer(s, { type: "ANIMATION_UNFOLDING_COMPLETE" });

      // Build a shot that misses (aim far from any unit)
      const defender = s.players[1];
      const pos = { x: 0.01, y: 0.01 };
      const computed = computeShotResult(pos, defender, defaultConfig.rules);
      const shot = buildShot(pos, "p1", 1, computed);
      s = gameReducer(s, { type: "RESOLVE_SHOT", shot });
      // Miss → TurnHandoff (no win)
      expect(["TurnHandoff", "GameOver"]).toContain(s.phase);
    });

    it("END_TURN switches current player", () => {
      let s = fullyDeployedState();
      expect(s.currentPlayerId).toBe("p1");
      // Fast-forward to TurnHandoff
      s = gameReducer(s, { type: "FIRE" });
      s = gameReducer(s, { type: "ANIMATION_FOLDING_START" });
      s = gameReducer(s, { type: "ANIMATION_FOLDING_COMPLETE" });
      s = gameReducer(s, { type: "ANIMATION_PRESSING_COMPLETE" });
      s = gameReducer(s, { type: "ANIMATION_UNFOLDING_COMPLETE" });
      const pos = { x: 0.01, y: 0.01 };
      const shot = buildShot(pos, "p1", 1, computeShotResult(pos, s.players[1], defaultConfig.rules));
      s = gameReducer(s, { type: "RESOLVE_SHOT", shot });
      if (s.phase === "TurnHandoff") {
        s = gameReducer(s, { type: "END_TURN" });
        expect(s.currentPlayerId).toBe("p2");
        expect(s.phase).toBe("Aiming");
      }
    });

    it("multi-shot turn: END_TURN decrements shotsRemaining before switching player", () => {
      let s = gameReducer(createInitialState(), {
        type: "START_GAME",
        config: { ...defaultConfig, rules: { ...C.DEFAULT_RULES, shotsPerTurn: 2 } },
      });
      s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p1" });
      s = gameReducer(s, { type: "RANDOMIZE_PLACEMENT", playerId: "p2" });
      s = gameReducer(s, { type: "LOCK_LAYOUT", playerId: "p1" });
      s = gameReducer(s, { type: "LOCK_LAYOUT", playerId: "p2" });
      expect(s.shotsRemainingInTurn).toBe(2);

      // Simulate first shot → TurnHandoff
      s = gameReducer(s, { type: "FIRE" });
      s = gameReducer(s, { type: "ANIMATION_FOLDING_START" });
      s = gameReducer(s, { type: "ANIMATION_FOLDING_COMPLETE" });
      s = gameReducer(s, { type: "ANIMATION_PRESSING_COMPLETE" });
      s = gameReducer(s, { type: "ANIMATION_UNFOLDING_COMPLETE" });
      const pos = { x: 0.01, y: 0.01 };
      const shot = buildShot(pos, "p1", 1, computeShotResult(pos, s.players[1], s.config.rules));
      s = gameReducer(s, { type: "RESOLVE_SHOT", shot });

      if (s.phase === "TurnHandoff") {
        s = gameReducer(s, { type: "END_TURN" });
        // Should still be p1's turn, now on shot 2
        expect(s.currentPlayerId).toBe("p1");
        expect(s.shotsRemainingInTurn).toBe(1);
      }
    });
  });

  describe("REMATCH", () => {
    it("resets to Setup phase", () => {
      let s = fullyDeployedState();
      s = gameReducer(s, { type: "GAME_OVER", winner: "p1" });
      expect(s.phase).toBe("GameOver");
      const rematch = gameReducer(s, { type: "REMATCH" });
      expect(rematch.phase).toBe("Setup");
      expect(rematch.winner).toBeNull();
    });
  });

  describe("RETURN_TO_MENU", () => {
    it("resets to MainMenu from any state", () => {
      let s = fullyDeployedState();
      s = gameReducer(s, { type: "RETURN_TO_MENU" });
      expect(s.phase).toBe("MainMenu");
    });
  });
});
