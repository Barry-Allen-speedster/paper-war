/**
 * localStorage wrapper with versioning and safe parsing.
 * All reads are try/catch — malformed data returns safe defaults.
 */
import type { GameState } from "../game/types";
import { DEFAULT_CONFIG } from "../game/config";
import type { ThemeId } from "../themes/types";
import type { Difficulty } from "../game/types";
import type { RuleConfig } from "../game/types";

const VERSION = DEFAULT_CONFIG.STORAGE_VERSION;

const KEYS = {
  GAME_STATE: "pw-game-state",
  SETTINGS: "pw-settings",
} as const;

export interface LifetimeStats {
  winsVsEasy: number;
  lossesVsEasy: number;
  winsVsMedium: number;
  lossesVsMedium: number;
  winsVsHard: number;
  lossesVsHard: number;
  winsVsHuman: number;
  lossesVsHuman: number;
}

export interface SettingsData {
  version: number;
  theme: ThemeId;
  soundEnabled: boolean;
  difficulty: Difficulty;
  rules: RuleConfig;
  stats: LifetimeStats;
}

const DEFAULT_STATS: LifetimeStats = {
  winsVsEasy: 0, lossesVsEasy: 0,
  winsVsMedium: 0, lossesVsMedium: 0,
  winsVsHard: 0, lossesVsHard: 0,
  winsVsHuman: 0, lossesVsHuman: 0,
};

const DEFAULT_SETTINGS: SettingsData = {
  version: VERSION,
  theme: "notebook",
  soundEnabled: true,
  difficulty: "medium",
  rules: { ...DEFAULT_CONFIG.DEFAULT_RULES },
  stats: { ...DEFAULT_STATS },
};

function safeRead<T>(key: string, validate: (raw: unknown) => T | null): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or unavailable — silently fail
  }
}

// ─── Game State ───────────────────────────────────────────────────────────────

interface StoredGameState {
  version: number;
  state: GameState;
}

export function saveGameState(state: GameState): void {
  safeWrite(KEYS.GAME_STATE, { version: VERSION, state });
}

export function loadGameState(): GameState | null {
  return safeRead<GameState>(KEYS.GAME_STATE, (raw) => {
    const stored = raw as StoredGameState;
    if (!stored || typeof stored !== "object") return null;
    if (stored.version !== VERSION) return null;
    if (!stored.state || typeof stored.state !== "object") return null;
    return stored.state as GameState;
  });
}

export function clearGameState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEYS.GAME_STATE);
  } catch { /* ignore */ }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function saveSettings(settings: SettingsData): void {
  safeWrite(KEYS.SETTINGS, settings);
}

export function loadSettings(): SettingsData {
  const loaded = safeRead<SettingsData>(KEYS.SETTINGS, (raw) => {
    const s = raw as SettingsData;
    if (!s || typeof s !== "object") return null;
    if (s.version !== VERSION) return null;
    // Merge to ensure all keys exist (handles partial upgrades)
    // Deep-merge rules so new rule fields get defaults even from old saves
    return {
      ...DEFAULT_SETTINGS,
      ...s,
      rules: { ...DEFAULT_SETTINGS.rules, ...(s.rules ?? {}) },
      stats: { ...DEFAULT_STATS, ...(s.stats ?? {}) },
    };
  });
  return loaded ?? { ...DEFAULT_SETTINGS };
}
