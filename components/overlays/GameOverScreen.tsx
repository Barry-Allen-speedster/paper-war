"use client";
import { useRouter } from "next/navigation";
import { useGameStore } from "@hooks/useGameStore";
import { useSettingsStore } from "@hooks/useSettingsStore";
import { useNetStore } from "@hooks/useNetStore";
import { Button } from "@components/ui/Button";
import { UnitMarker } from "@components/battlefield/UnitMarker";
import { t } from "@lib/i18n";
import type { PlayerId } from "@lib/game/types";

interface Props {
  viewingPlayerId: PlayerId;
}

export function GameOverScreen({ viewingPlayerId }: Props) {
  const router = useRouter();
  const { gameState, dispatch } = useGameStore();
  const transport = useNetStore((s) => s.transport);
  const { recordWin, recordLoss, difficulty } = useSettingsStore();
  const { winner, players, config } = gameState;

  const isWinner = winner === viewingPlayerId;
  const p1 = players[0];
  const p2 = players[1];

  // Record stats once
  const statsRecorded = typeof window !== "undefined" && sessionStorage.getItem("pw-stats-recorded");
  if (!statsRecorded && winner) {
    sessionStorage.setItem("pw-stats-recorded", "1");
    const mode = config.mode === "ai"
      ? (difficulty ?? "medium")
      : "human";
    if (isWinner) recordWin(mode as "easy" | "medium" | "hard" | "human");
    else recordLoss(mode as "easy" | "medium" | "hard" | "human");
  }

  // Stats
  const ownPlayer = viewingPlayerId === "p1" ? p1 : p2;
  const totalShots = ownPlayer.shots.length;
  const hits = ownPlayer.shots.filter((s) => s.result === "hit" || s.result === "kill").length;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;

  function handleRematch() {
    sessionStorage.removeItem("pw-stats-recorded");
    if (config.mode === "online") {
      transport?.send({
        type: "rematch",
        seed: config.seed,
        rules: config.rules,
        seq: 0,
      });
    }
    dispatch({ type: "REMATCH" });
    router.push(config.mode === "local" ? "/play/local" : config.mode === "ai" ? "/play/ai" : "/play/online");
  }

  function handleMenu() {
    sessionStorage.removeItem("pw-stats-recorded");
    dispatch({ type: "RETURN_TO_MENU" });
    router.push("/");
  }

  const winnerLabel = winner === "p1" ? t("shared.player1") : config.mode === "ai" ? t("shared.ai") : t("shared.player2");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
      {/* Winner banner */}
      <div className={`text-center mb-8 ${isWinner ? "text-[var(--pw-accent)]" : "text-[var(--pw-text-muted)]"}`}>
        <div className="text-6xl mb-3" aria-hidden="true">{isWinner ? "🏆" : "💀"}</div>
        <h1 className="text-4xl font-bold">{t("gameover.winner", { player: winnerLabel })}</h1>
      </div>

      {/* No cheat detection in v0.2 — armies were always visible */}

      {/* Full board reveal */}
      <div className="w-full max-w-2xl mb-8">
        <div className="grid grid-cols-2 gap-4">
          {([p1, p2] as const).map((player, i) => (
            <div key={player.id} className="border border-[var(--pw-border)] rounded-lg p-3 bg-[var(--pw-surface)]">
              <p className="text-xs font-semibold text-[var(--pw-text-muted)] mb-2">
                {i === 0 ? t("shared.player1") : config.mode === "ai" ? t("shared.ai") : t("shared.player2")}
              </p>
              <div className="relative" style={{ paddingBottom: "100%" }}>
                <svg className="absolute inset-0 w-full h-full">
                  {player.units.map((u) => (
                    <UnitMarker key={u.id} unit={u} halfWidth={200} halfHeight={200} revealed />
                  ))}
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-8 mb-8 text-center">
        <div>
          <p className="text-2xl font-bold">{totalShots}</p>
          <p className="text-xs text-[var(--pw-text-muted)]">{t("gameover.stats.shots")}</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{accuracy}%</p>
          <p className="text-xs text-[var(--pw-text-muted)]">{t("gameover.stats.accuracy")}</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{gameState.turn}</p>
          <p className="text-xs text-[var(--pw-text-muted)]">{t("gameover.stats.turns")}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleRematch}>{t("gameover.rematch")}</Button>
        <Button variant="secondary" onClick={handleMenu}>{t("gameover.menu")}</Button>
      </div>
    </div>
  );
}
