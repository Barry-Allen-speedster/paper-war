import { describe, it, expect, beforeEach } from "vitest";
import { saveSettings, loadSettings, saveGameState, loadGameState, clearGameState } from "@lib/storage/storage";
import { createInitialState } from "@lib/game/reducer";
import { DEFAULT_CONFIG } from "@lib/game/config";

// jsdom provides localStorage
beforeEach(() => {
  localStorage.clear();
});

describe("storage", () => {
  describe("settings", () => {
    it("load returns defaults when nothing saved", () => {
      const s = loadSettings();
      expect(s.theme).toBe("notebook");
      expect(s.soundEnabled).toBe(true);
      expect(s.version).toBe(DEFAULT_CONFIG.STORAGE_VERSION);
    });

    it("save and load round-trips", () => {
      const settings = loadSettings();
      settings.theme = "blueprint";
      settings.soundEnabled = false;
      saveSettings(settings);

      const loaded = loadSettings();
      expect(loaded.theme).toBe("blueprint");
      expect(loaded.soundEnabled).toBe(false);
    });

    it("returns defaults for corrupt JSON", () => {
      localStorage.setItem("pw-settings", "not valid json{{{");
      const s = loadSettings();
      expect(s.theme).toBe("notebook");
    });

    it("returns defaults for wrong version", () => {
      localStorage.setItem("pw-settings", JSON.stringify({ version: 999, theme: "blueprint" }));
      const s = loadSettings();
      expect(s.theme).toBe("notebook");
    });
  });

  describe("game state", () => {
    it("returns null when nothing saved", () => {
      expect(loadGameState()).toBeNull();
    });

    it("save and load round-trips", () => {
      const state = createInitialState();
      saveGameState(state);
      const loaded = loadGameState();
      expect(loaded).not.toBeNull();
      expect(loaded?.phase).toBe("MainMenu");
    });

    it("clearGameState removes saved state", () => {
      saveGameState(createInitialState());
      clearGameState();
      expect(loadGameState()).toBeNull();
    });

    it("returns null for corrupt JSON", () => {
      localStorage.setItem("pw-game-state", "{{broken");
      expect(loadGameState()).toBeNull();
    });

    it("returns null for wrong version", () => {
      localStorage.setItem("pw-game-state", JSON.stringify({ version: 999, state: {} }));
      expect(loadGameState()).toBeNull();
    });
  });
});
