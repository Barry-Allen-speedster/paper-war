"use client";
/**
 * Zustand game store.
 * Wraps gameReducer, handles autosave, and exposes dispatch.
 */
import { create } from "zustand";
import type { GameState, GameAction } from "@lib/game/types";
import { gameReducer, createInitialState } from "@lib/game/reducer";
import { saveGameState, loadGameState, clearGameState } from "@lib/storage/storage";

interface GameStore {
  gameState: GameState;
  dispatch: (action: GameAction) => void;
  clearSave: () => void;
}

function shouldAutosave(state: GameState): boolean {
  return (
    state.phase !== "MainMenu" &&
    state.phase !== "GameOver" &&
    state.config.mode !== "online"
  );
}

export const useGameStore = create<GameStore>((set, get) => {
  // Try to restore a saved game on init
  const saved = loadGameState();
  const initial = saved ?? createInitialState();

  return {
    gameState: initial,

    dispatch(action: GameAction) {
      const next = gameReducer(get().gameState, action);
      set({ gameState: next });

      if (shouldAutosave(next)) {
        saveGameState(next);
      } else if (next.phase === "GameOver" || next.phase === "MainMenu") {
        clearGameState();
      }
    },

    clearSave() {
      clearGameState();
      set({ gameState: createInitialState() });
    },
  };
});
