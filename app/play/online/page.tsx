"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@hooks/useGameStore";
import { useNetStore } from "@hooks/useNetStore";
import { GameLobby } from "@components/lobby/GameLobby";
import { UnitDeployment } from "@components/deployment/UnitDeployment";
import { BattlefieldScreen } from "@components/battlefield/BattlefieldScreen";
import { TurnControllerOverlay } from "@components/overlays/TurnControllerOverlay";
import { GameOverScreen } from "@components/overlays/GameOverScreen";
import { PauseMenu } from "@components/overlays/PauseMenu";
import { ErrorBoundary } from "@components/ui/ErrorBoundary";
import { ToastProvider } from "@components/ui/Toast";
import { Button } from "@components/ui/Button";
import { t } from "@lib/i18n";
import type { NetMessage } from "@lib/net/protocol";
import { computeStateHash } from "@lib/net/protocol";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { buildShot, computeShotResult, applyShot } from "@lib/game/rules";

const C = DEFAULT_CONFIG;

function OnlineGameInner() {
  const router = useRouter();
  const { gameState, dispatch } = useGameStore();
  const { transport, peerRole, connectionStatus } = useNetStore();
  const [showPause, setShowPause] = useState(false);
  const [myDeployed, setMyDeployed] = useState(false);
  const [disconnectSeconds, setDisconnectSeconds] = useState(C.RECONNECT_WINDOW_MS / 1000);
  const [syncError, setSyncError] = useState(false);

  const { phase, config } = gameState;
  const myPlayerId = peerRole === "host" ? "p1" : "p2";
  const oppPlayerIdx = myPlayerId === "p1" ? 1 : 0;

  // ── Client-side redirect ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "MainMenu") router.push("/");
  }, [phase, router]);

  // ── Reset deploy state on rematch ─────────────────────────────────────────
  useEffect(() => {
    if (phase === "Setup") setMyDeployed(false);
  }, [phase]);

  // ── Network message handler ───────────────────────────────────────────────
  useEffect(() => {
    if (!transport) return;

    const unsub = transport.onMessage(async (msg: NetMessage) => {
      switch (msg.type) {
        case "shot": {
          // Both clients compute the result from shared state
          const defender = gameState.players[oppPlayerIdx]!;
          const computed = computeShotResult(msg.pos, defender, config.rules);
          const shot = buildShot(msg.pos, myPlayerId === "p1" ? "p2" : "p1", gameState.turn, computed);

          dispatch({ type: "RESOLVE_SHOT", shot });
          dispatch({ type: "END_TURN" });

          // Send our state hash for consistency check
          const allShots = [
            ...gameState.players[0]!.shots,
            ...gameState.players[1]!.shots,
            shot,
          ];
          const hash = await computeStateHash(allShots);
          transport.send({ type: "stateHash", seq: msg.seq + 1, hash });
          break;
        }

        case "stateHash": {
          // Verify our own state hash matches
          const allShots = [
            ...gameState.players[0]!.shots,
            ...gameState.players[1]!.shots,
          ];
          const myHash = await computeStateHash(allShots);
          if (myHash !== msg.hash) {
            setSyncError(true);
            dispatch({ type: "SYNC_ERROR" });
          }
          break;
        }

        case "rematch": {
          dispatch({ type: "REMATCH" });
          break;
        }

        case "forfeit": {
          dispatch({ type: "GAME_OVER", winner: myPlayerId });
          break;
        }

        case "ping": {
          transport.send({ type: "pong", seq: msg.seq + 1 });
          break;
        }
      }
    });

    return unsub;
  }, [transport, gameState, myPlayerId, oppPlayerIdx, config.rules, dispatch]);

  // ── Disconnect countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (connectionStatus !== "reconnecting") {
      setDisconnectSeconds(C.RECONNECT_WINDOW_MS / 1000);
      return;
    }
    const interval = setInterval(() => {
      setDisconnectSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          dispatch({ type: "GAME_OVER", winner: myPlayerId });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus, myPlayerId, dispatch]);

  if (phase === "MainMenu") return null;
  if (phase === "Lobby") return <GameLobby />;

  if (phase === "GameOver") {
    return <GameOverScreen viewingPlayerId={myPlayerId} />;
  }

  if (phase === "Setup" && !myDeployed) {
    return (
      <UnitDeployment
        playerId={myPlayerId}
        onReady={() => {
          // In v0.2: send ready with skin preference only (no commitment)
          transport?.send({
            type: "ready",
            skinId: "notebook",
            inkColor: "#1a1a2e",
            seq: 1,
          });
          setMyDeployed(true);
        }}
      />
    );
  }

  // Disconnect overlay
  if (connectionStatus === "reconnecting") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[var(--pw-surface)] rounded-xl p-8 text-center max-w-sm mx-4">
          <p className="text-xl font-bold mb-2">{t("shared.disconnect.title")}</p>
          <p className="text-[var(--pw-text-muted)] mb-6">
            {t("shared.disconnect.body", { seconds: disconnectSeconds })}
          </p>
          <Button variant="danger" onClick={() => dispatch({ type: "GAME_OVER", winner: myPlayerId })}>
            {t("shared.forfeit")}
          </Button>
        </div>
      </div>
    );
  }

  // Desync dialog
  if (syncError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[var(--pw-surface)] rounded-xl p-8 text-center max-w-sm mx-4">
          <p className="text-xl font-bold mb-2">⚠ Desync Detected</p>
          <p className="text-[var(--pw-text-muted)] mb-6">
            The game states have diverged. This may be a network glitch.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setSyncError(false)}>Continue Anyway</Button>
            <Button variant="danger" onClick={() => dispatch({ type: "RETURN_TO_MENU" })}>
              {t("shared.leave")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="absolute top-2 right-2 z-20">
        <Button variant="ghost" onClick={() => setShowPause(true)} aria-label={t("battle.pause")} className="text-xl">
          ⏸
        </Button>
      </div>
      <BattlefieldScreen viewingPlayerId={myPlayerId} />
      <TurnControllerOverlay viewingPlayerId={myPlayerId} />
      <PauseMenu open={showPause} onClose={() => setShowPause(false)} />
    </div>
  );
}

export default function OnlineGamePage() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OnlineGameInner />
      </ToastProvider>
    </ErrorBoundary>
  );
}
