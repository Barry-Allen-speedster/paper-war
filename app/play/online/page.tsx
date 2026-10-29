"use client";
import { useState, useEffect, useRef } from "react";
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
import { DEFAULT_CONFIG } from "@lib/game/config";

const C = DEFAULT_CONFIG;

function OnlineGameInner() {
  const router = useRouter();
  const { gameState, dispatch } = useGameStore();
  const { transport, peerRole, connectionStatus } = useNetStore();
  const [showPause, setShowPause] = useState(false);
  const [myDeployed, setMyDeployed] = useState(false);
  const [disconnectSeconds, setDisconnectSeconds] = useState(C.RECONNECT_WINDOW_MS / 1000);
  const [syncError, setSyncError] = useState(false);

  // Always-fresh ref so message handler never has a stale closure
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const { phase } = gameState;
  const myPlayerId = peerRole === "host" ? "p1" : "p2";
  const oppPlayerId: "p1" | "p2" = myPlayerId === "p1" ? "p2" : "p1";

  // ── Redirect to menu if no game ────────────────────────────────────────────
  useEffect(() => {
    if (phase === "MainMenu") router.push("/");
  }, [phase, router]);

  // ── Reset deploy flag on rematch ───────────────────────────────────────────
  useEffect(() => {
    if (phase === "Setup") setMyDeployed(false);
  }, [phase]);

  // ── Poll: keep re-sending "ready" while waiting for opponent ──────────────
  // Repeat deployment details so a player who subscribes slightly later still
  // receives the opponent's army and ready state.
  useEffect(() => {
    if (!transport || !myDeployed || phase !== "Setup") return;
    const send = () => {
      const ownArmy = gameStateRef.current.players[myPlayerId === "p1" ? 0 : 1]!.units;
      transport.send({ type: "ready", skinId: "notebook", inkColor: "#333", layout: ownArmy, seq: 0 });
    };
    send();
    const id = setInterval(send, 1500);
    return () => clearInterval(id);
  }, [transport, myDeployed, phase]);

  // ── Message handler — stable, uses ref for state ───────────────────────────
  useEffect(() => {
    if (!transport) return;

    const unsub = transport.onMessage((msg) => {
      switch (msg.type) {
        case "startGame":
          // Host told guest to advance from Lobby → Setup
          dispatch({ type: "ADVANCE_FROM_LOBBY" });
          break;

        case "ready": {
          dispatch({ type: "SYNC_REMOTE_LAYOUT", playerId: oppPlayerId, units: msg.layout });
          break;
        }

        case "shot": {
          // Drive the same aiming/fold flow on both clients. Each client has
          // both layouts from the ready exchange and resolves the same shot.
          dispatch({ type: "AIM", pos: msg.pos });
          dispatch({ type: "FIRE" });
          break;
        }

        case "rematch":
          dispatch({ type: "REMATCH" });
          break;

        case "forfeit":
          dispatch({ type: "GAME_OVER", winner: myPlayerId });
          break;

        case "ping":
          transport.send({ type: "pong", seq: msg.seq + 1 });
          break;
      }
    });

    return unsub;
    // Only re-subscribe when transport or player IDs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, myPlayerId, oppPlayerId]);

  // ── Disconnect countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (connectionStatus !== "reconnecting") {
      setDisconnectSeconds(C.RECONNECT_WINDOW_MS / 1000);
      return;
    }
    const id = setInterval(() => {
      setDisconnectSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          dispatch({ type: "GAME_OVER", winner: myPlayerId });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [connectionStatus, myPlayerId, dispatch]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "MainMenu") return null;

  if (phase === "Lobby") return <GameLobby />;

  if (phase === "GameOver") return <GameOverScreen viewingPlayerId={myPlayerId} />;

  // Deployment
  if (phase === "Setup" && !myDeployed) {
    return (
      <UnitDeployment
        playerId={myPlayerId}
        onReady={() => {
          setMyDeployed(true);
          dispatch({ type: "LOCK_LAYOUT", playerId: myPlayerId });
          // Send immediately: if the other player is already ready, this
          // action can advance straight to Aiming before the polling effect
          // gets a chance to run.
          const ownArmy = gameStateRef.current.players[myPlayerId === "p1" ? 0 : 1]!.units;
          transport?.send({ type: "ready", skinId: "notebook", inkColor: "#333", layout: ownArmy, seq: 0 });
        }}
      />
    );
  }

  // Waiting for opponent to deploy (polling effect keeps re-sending "ready")
  if (phase === "Setup" && myDeployed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--pw-bg)] p-6">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-bold mb-2">Waiting for opponent…</h2>
        <p className="text-[var(--pw-text-muted)] text-sm text-center max-w-xs">
          Your army is placed. Waiting for your opponent to finish deploying.
        </p>
        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--pw-accent)] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={() => { dispatch({ type: "RETURN_TO_MENU" }); router.push("/"); }}
          className="mt-8 text-sm text-[var(--pw-text-muted)]"
        >
          ← Back to Menu
        </Button>
      </div>
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
          <Button
            variant="danger"
            onClick={() => dispatch({ type: "GAME_OVER", winner: myPlayerId })}
          >
            {t("shared.forfeit")}
          </Button>
        </div>
      </div>
    );
  }

  // Desync
  if (syncError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[var(--pw-surface)] rounded-xl p-8 text-center max-w-sm mx-4">
          <p className="text-xl font-bold mb-2">⚠ Desync Detected</p>
          <p className="text-[var(--pw-text-muted)] mb-6">
            Game states diverged — this may be a network blip.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setSyncError(false)}>Continue Anyway</Button>
            <Button
              variant="danger"
              onClick={() => { dispatch({ type: "RETURN_TO_MENU" }); router.push("/"); }}
            >
              Leave
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="relative h-screen">
      <div className="absolute top-2 right-2 z-20">
        <Button
          variant="ghost"
          onClick={() => setShowPause(true)}
          aria-label="Pause"
          className="text-xl"
        >
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
