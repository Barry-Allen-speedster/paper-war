"use client";
import { useSettingsStore } from "@hooks/useSettingsStore";
import { THEME_IDS, getTheme } from "@lib/themes/index";
import { t } from "@lib/i18n";
import { Button } from "./Button";
import type { ThemeId } from "@lib/themes/types";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { theme, soundEnabled, setTheme, setSoundEnabled } = useSettingsStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label={t("settings.title")}
        className="relative z-10 w-80 h-full bg-[var(--pw-surface)] shadow-2xl flex flex-col p-6 gap-6 animate-slide-up"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("settings.title")}</h2>
          <Button variant="ghost" onClick={onClose} aria-label={t("settings.close")}>✕</Button>
        </div>

        {/* Theme selector */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-[var(--pw-text-muted)]">
            {t("settings.theme")}
          </label>
          <div className="flex flex-col gap-2">
            {THEME_IDS.map((id: ThemeId) => {
              const cfg = getTheme(id);
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                    theme === id
                      ? "border-[var(--pw-accent)] bg-[var(--pw-bg)]"
                      : "border-[var(--pw-border)] hover:border-[var(--pw-accent)]",
                  ].join(" ")}
                >
                  <span className="font-medium">{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between">
          <span className="font-semibold">{t("settings.sound")}</span>
          <button
            role="switch"
            aria-checked={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={[
              "w-12 h-6 rounded-full transition-colors relative",
              soundEnabled ? "bg-[var(--pw-accent)]" : "bg-[var(--pw-border)]",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                soundEnabled ? "translate-x-6" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>
      </aside>
    </div>
  );
}
