"use client";
/**
 * Zustand settings store — theme, sound, difficulty, rules, lifetime stats.
 * Persisted to localStorage via the storage module.
 */
import { create } from "zustand";
import type { ThemeId } from "@lib/themes/types";
import type { Difficulty, RuleConfig } from "@lib/game/types";
import {
  loadSettings,
  saveSettings,
  type SettingsData,
  type LifetimeStats,
} from "@lib/storage/storage";

interface SettingsStore extends SettingsData {
  setTheme: (theme: ThemeId) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setRules: (rules: Partial<RuleConfig>) => void;
  recordWin: (mode: "easy" | "medium" | "hard" | "human") => void;
  recordLoss: (mode: "easy" | "medium" | "hard" | "human") => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const persisted = loadSettings();

  function persist(partial: Partial<SettingsData>) {
    const next = { ...get(), ...partial };
    saveSettings(next);
    set(partial);
  }

  return {
    ...persisted,

    setTheme(theme) { persist({ theme }); },
    setSoundEnabled(soundEnabled) { persist({ soundEnabled }); },
    setDifficulty(difficulty) { persist({ difficulty }); },

    setRules(partial) {
      const rules = { ...get().rules, ...partial };
      persist({ rules });
    },

    recordWin(mode) {
      const stats: LifetimeStats = { ...get().stats };
      if (mode === "easy") stats.winsVsEasy++;
      else if (mode === "medium") stats.winsVsMedium++;
      else if (mode === "hard") stats.winsVsHard++;
      else stats.winsVsHuman++;
      persist({ stats });
    },

    recordLoss(mode) {
      const stats: LifetimeStats = { ...get().stats };
      if (mode === "easy") stats.lossesVsEasy++;
      else if (mode === "medium") stats.lossesVsMedium++;
      else if (mode === "hard") stats.lossesVsHard++;
      else stats.lossesVsHuman++;
      persist({ stats });
    },
  };
});
