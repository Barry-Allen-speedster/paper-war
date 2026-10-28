"use client";
import { t } from "@lib/i18n";
import type { PlayerId } from "@lib/game/types";

interface Props {
  nextPlayerId: PlayerId;
  onReveal: () => void;
}

export function PassDeviceScreen({ nextPlayerId, onReveal }: Props) {
  const playerLabel = nextPlayerId === "p1" ? t("shared.player1") : t("shared.player2");

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--pw-bg)] cursor-pointer select-none"
      onClick={onReveal}
      onKeyDown={(e) => e.key === "Enter" && onReveal()}
      role="button"
      tabIndex={0}
      aria-label={t("pass.title", { player: playerLabel })}
    >
      <div className="text-center px-8">
        <div className="text-6xl mb-6" aria-hidden="true">📄</div>
        <h2 className="text-3xl font-bold mb-3">{t("pass.title", { player: playerLabel })}</h2>
        <p className="text-[var(--pw-text-muted)] mb-8">{t("pass.instruction")}</p>
        <div className="border-2 border-dashed border-[var(--pw-border)] rounded-xl p-6 text-[var(--pw-text-muted)] text-sm animate-pulse">
          {t("deploy.pass.tap")}
        </div>
      </div>
    </div>
  );
}
