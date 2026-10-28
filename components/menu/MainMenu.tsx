"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@hooks/useGameStore";
import { useSettingsStore } from "@hooks/useSettingsStore";
import { Button } from "@components/ui/Button";
import { SettingsDrawer } from "@components/ui/SettingsDrawer";
import { HowToPlayModal } from "./HowToPlayModal";
import { RulesPanel } from "./RulesPanel";
import { t } from "@lib/i18n";
import { Volume2, VolumeX, Settings, HelpCircle } from "lucide-react";
import { THEME_IDS, getTheme } from "@lib/themes/index";
import type { Difficulty } from "@lib/game/types";
import type { ThemeId } from "@lib/themes/types";

export function MainMenu() {
  const router = useRouter();
  const { dispatch } = useGameStore();
  const { rules, difficulty, setDifficulty, soundEnabled, setSoundEnabled, theme, setTheme, stats } =
    useSettingsStore();

  const [showHowTo, setShowHowTo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"local" | "ai" | "online" | null>(null);

  function startGame(mode: "local" | "ai" | "online") {
    const seed = Math.floor(Math.random() * 2 ** 31);
    dispatch({
      type: "START_GAME",
      config: {
        mode,
        difficulty: mode === "ai" ? difficulty : null,
        rules,
        seed,
      },
    });
    if (mode === "local") router.push("/play/local");
    else if (mode === "ai") router.push("/play/ai");
    else router.push("/play/online");
  }

  const totalWins = stats.winsVsEasy + stats.winsVsMedium + stats.winsVsHard + stats.winsVsHuman;
  const totalLosses = stats.lossesVsEasy + stats.lossesVsMedium + stats.lossesVsHard + stats.lossesVsHuman;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-[var(--pw-text)] font-game mb-2">
          {t("menu.title")}
        </h1>
        <p className="text-[var(--pw-text-muted)]">{t("menu.subtitle")}</p>
      </div>

      {/* Mode Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
        <Button
          onClick={() => startGame("local")}
          className="w-full text-lg py-4"
        >
          📄 {t("menu.mode.local")}
        </Button>

        <div>
          <Button
            variant="secondary"
            onClick={() => setSelectedMode(selectedMode === "ai" ? null : "ai")}
            className="w-full text-lg py-4"
          >
            🤖 {t("menu.mode.ai")}
          </Button>
          {selectedMode === "ai" && (
            <div className="flex gap-2 mt-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDifficulty(d); startGame("ai"); }}
                  className={[
                    "flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors",
                    difficulty === d
                      ? "border-[var(--pw-accent)] bg-[var(--pw-accent)] text-white"
                      : "border-[var(--pw-border)] hover:border-[var(--pw-accent)]",
                  ].join(" ")}
                >
                  {t(`menu.difficulty.${d}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          onClick={() => startGame("online")}
          className="w-full text-lg py-4"
        >
          🌐 {t("menu.mode.online")}
        </Button>
      </div>

      {/* Theme preview strip */}
      <div className="flex gap-2 mb-6">
        {THEME_IDS.map((id: ThemeId) => {
          const cfg = getTheme(id);
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              title={cfg.name}
              className={[
                "w-10 h-10 rounded-full border-4 transition-transform hover:scale-110",
                theme === id ? "border-[var(--pw-accent)] scale-110" : "border-transparent",
              ].join(" ")}
              style={{ background: cfg.cssVars["--pw-surface"] }}
              aria-label={cfg.name}
              aria-pressed={theme === id}
            />
          );
        })}
      </div>

      {/* Stats */}
      {(totalWins + totalLosses) > 0 && (
        <p className="text-sm text-[var(--pw-text-muted)] mb-4">
          {totalWins}W – {totalLosses}L lifetime
        </p>
      )}

      {/* Bottom actions */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => setShowHowTo(true)} aria-label={t("menu.howToPlay")}>
          <HelpCircle size={20} />
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowRules(!showRules)}
          aria-label={t("menu.rules")}
          aria-expanded={showRules}
        >
          ⚙ {t("menu.rules")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSoundEnabled(!soundEnabled)}
          aria-label={soundEnabled ? t("menu.sound.on") : t("menu.sound.off")}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </Button>
        <Button variant="ghost" onClick={() => setShowSettings(true)} aria-label={t("settings.title")}>
          <Settings size={20} />
        </Button>
      </div>

      {showRules && (
        <div className="mt-4 w-full max-w-xs bg-[var(--pw-surface)] rounded-lg p-4 border border-[var(--pw-border)]">
          <RulesPanel />
        </div>
      )}

      <HowToPlayModal open={showHowTo} onClose={() => setShowHowTo(false)} />
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
