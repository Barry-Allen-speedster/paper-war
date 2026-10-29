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
import { computeStateHash } from "@lib/net/protocol";
import { DEFAULT_CONFIG } from "@lib/game/config";
import { buildShot, computeShotResult } from "@lib/game/rules";

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

  // ── Poll: keep re-sending "ready" every 1.5 s while waiting for opponent ───
  // This ensures the opponent receives it even if they connected after we tapped Ready.
  useEffect(() => {
    if (!transport || !myDeployed || phase !== "Setup") return;
    const send = () =>
      transport.send({ type: "ready", skinId: "notebook", inkColor: "#333", seq: 1 });
    send(); // send immediately
    const id = setInterval(send, 1500);
    return () => clearInterval(id);
  }, [transport, myDeployed, phase]);

  // ── Message handler — stable, uses ref for state ───────────────────────────
  useEffect(() => {
    if (!transport) return;

    const unsub = transport.onMessage(async (msg) => {
      const state = gameStateRef.current;

      switch (msg.type) {

        case "hello":
          // Guest just connected — no-op here, lobby handles it
          break;

        case "startGame":
          // Host told guest to advance from Lobby → Setup
          dispatch({ type: "ADVANCE_FROM_LOBBY" });
          break;

        case "ready": {
          // Opponent finished deploying.
          // Lock their layout in OUR local state so the reducer sees both
          // players locked and automatically transitions to Aiming.
          dispatch({ type: "LOCK_LAYOUT", playerId: oppPlayerId });
          break;
        }

        case "shot": {
          // Opponent fired at us. Mirror the shot position (fold mechanic).
          const isPortrait =
            typeof window !== "undefined" &&
            window.innerHeight > window.innerWidth;
          const mirroredPos = isPortrait
            ? { x: msg.pos.x, y: 1 - msg.pos.y }
            : { x: 1 - msg.pos.x, y: msg.pos.y };

          const myIdx = myPlayerId === "p1" ? 0 : 1;
          const defender = state.players[myIdx]!;
          const computed = computeShotResult(mirroredPos, defender, state.config.rules);
          const shot = buildShot(mirroredPos, oppPlayerId, state.turn, computed);

          // Drive animation then resolve
          dispatch({ type: "ANIMATION_FOLDING_START" });
          setTimeout(() => {
            dispatch({ type: "ANIMATION_FOLDING_COMPLETE" });
            dispatch({ type: "ANIMATION_PRESSING_COMPLETE" });
            dispatch({ type: "ANIMATION_UNFOLDING_COMPLETE" });
            dispatch({ type: "RESOLVE_SHOT", shot });
            dispatch({ type: "END_TURN" });
          }, C.ANIM_TOTAL_MS);

          // Consistency check
          const allShots = [
            ...state.players[0]!.shots,
            ...state.players[1]!.shots,
            shot,
          ];
          const hash = await computeStateHash(allShots);
          transport.send({ type: "stateHash", seq: msg.seq + 1, hash });
          break;
        }

        case "stateHash": {
          const allShots = [
            ...state.players[0]!.shots,
            ...state.players[1]!.shots,
          ];
          if (allShots.length > 0) {
            const myHash = await computeStateHash(allShots);
            if (myHash !== msg.hash) setSyncError(true);
          }
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
          // ready polling effect will broadcast to opponent
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
