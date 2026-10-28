"use client";
/**
 * TurnControllerOverlay — v0.2.
 * No privacy/pass-device screen. Shows a brief dismissable handoff banner
 * in local mode, an AI thinking indicator, or an online waiting message.
 */
import { useState, useEffect } from "react";
import { useGameStore } from "@hooks/useGameStore";
import { t } from "@lib/i18n";
import type { PlayerId } from "@lib/game/types";

interface Props {
  viewingPlayerId: PlayerId;
}

export function TurnControllerOverlay({ viewingPlayerId }: Props) {
  const { gameState } = useGameStore();
  const { phase, currentPlayerId, config } = gameState;
  const [bannerVisible, setBannerVisible] = useState(false);
  const [lastPlayer, setLastPlayer] = useState<PlayerId>(currentPlayerId);

  const isMyTurn = currentPlayerId === viewingPlayerId;

  // Show the banner whenever the turn changes to a different player
  useEffect(() => {
    if (phase !== "Aiming") return;
    if (currentPlayerId !== lastPlayer) {
      setLastPlayer(currentPlayerId);
      setBannerVisible(true);
      // Auto-dismiss after 1.8 s
      const t = setTimeout(() => setBannerVisible(false), 1800);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerId, phase]);

  const playerLabel = (id: PlayerId) =>
    config.mode === "ai" && id === "p2"
      ? t("shared.ai")
      : id === "p1" ? t("shared.player1") : t("shared.player2");

  // ── Local mode handoff banner ──────────────────────────────────────────────
  if (config.mode === "local" && bannerVisible && phase === "Aiming") {
    return (
      <div
        className="fixed inset-x-0 top-16 flex justify-center z-40 pointer-events-none"
        aria-live="polite"
      >
        <button
          className="bg-[var(--pw-surface)] border-2 border-[var(--pw-accent)] rounded-xl px-8 py-3 shadow-xl pointer-events-auto"
          onClick={() => setBannerVisible(false)}
          aria-label="Dismiss turn banner"
        >
          <span className="font-bold text-[var(--pw-accent)]">
            {t("battle.turn", { player: playerLabel(currentPlayerId) })}
          </span>
          <span className="text-xs text-[var(--pw-text-muted)] ml-3">tap to dismiss</span>
        </button>
      </div>
    );
  }

  // ── AI thinking ───────────────────────────────────────────────────────────
  if (config.mode === "ai" && !isMyTurn && phase === "Aiming") {
    return (
      <div className="fixed inset-x-0 top-16 flex justify-center z-30 pointer-events-none">
        <div className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-full px-6 py-3 shadow-lg flex items-center gap-2">
          <span className="inline-block animate-spin">⚙</span>
          <span className="text-sm">{t("battle.ai.thinking")}</span>
        </div>
      </div>
    );
  }

  // ── Online waiting ────────────────────────────────────────────────────────
  if (config.mode === "online" && !isMyTurn && phase === "Aiming") {
    return (
      <div className="fixed inset-x-0 top-16 flex justify-center z-30 pointer-events-none">
        <div className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-full px-6 py-3 shadow-lg">
          <span className="text-sm">{t("battle.waiting")}</span>
        </div>
      </div>
    );
  }

  return null;
}
