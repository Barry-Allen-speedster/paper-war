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
  const { transport, peerRole, connectionStatus, reset } = useNetStore();
  const [showPause, setShowPause] = useState(false);
  const [myDeployed, setMyDeployed] = useState(false);
  const [opponentDeployed, setOpponentDeployed] = useState(false);
  const [disconnectSeconds, setDisconnectSeconds] = useState(C.RECONNECT_WINDOW_MS / 1000);
  const [syncError, setSyncError] = useState(false);

  // Use a ref so the message handler always has the latest game state
  // without causing re-subscription on every render
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const { phase, config } = gameState;
  const myPlayerId = peerRole === "host" ? "p1" : "p2";
  const oppPlayerIdx = myPlayerId === "p1" ? 1 : 0;

  // ── Client-side redirect ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "MainMenu") router.push("/");
  }, [phase, router]);

  // ── Reset deploy state on rematch ───────────────────────────────────────────
  useEffect(() => {
    if (phase === "Setup") {
      setMyDeployed(false);
      setOpponentDeployed(false);
    }
  }, [phase]);

  // ── Subscribe to network messages — stable subscription (no gameState dep) ──
  useEffect(() => {
    if (!transport) return;

    const unsub = transport.onMessage(async (msg) => {
      const state = gameStateRef.current;
      const oppIdx = peerRole === "host" ? 1 : 0;

      switch (msg.type) {
        case "hello": {
          // Guest arrived — no action needed, lobby already handled this
          break;
        }

        case "ready": {
          // Opponent finished deploying
          setOpponentDeployed(true);
          break;
        }

        case "startGame": {
          // Host told us to start — advance from Lobby to Setup
          dispatch({ type: "ADVANCE_FROM_LOBBY" });
          break;
        }

        case "shot": {
          // Opponent fired — we are the defender, compute result locally
          const defender = state.players[oppIdx === 0 ? 0 : 1]!;
          // Mirror the shot position (fold mechanic: x mirrors)
          const isPortrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;
          const mirroredPos = isPortrait
            ? { x: msg.pos.x, y: 1 - msg.pos.y }
            : { x: 1 - msg.pos.x, y: msg.pos.y };

          const computed = computeShotResult(mirroredPos, defender, state.config.rules);
          const shot = buildShot(mirroredPos, myPlayerId === "p1" ? "p2" : "p1", state.turn, computed);

          dispatch({ type: "AIM", pos: msg.pos });
          dispatch({ type: "FIRE" });
          // Let the animation play; BattlefieldScreen will resolve after fold
          // We store the incoming shot data so handleFoldComplete can use it
          // For simplicity in online mode, we dispatch RESOLVE_SHOT directly
          // after a short delay matching the animation
          setTimeout(() => {
            dispatch({ type: "ANIMATION_FOLDING_START" });
            dispatch({ type: "ANIMATION_FOLDING_COMPLETE" });
            dispatch({ type: "ANIMATION_PRESSING_COMPLETE" });
            dispatch({ type: "ANIMATION_UNFOLDING_COMPLETE" });
            dispatch({ type: "RESOLVE_SHOT", shot });
            dispatch({ type: "END_TURN" });
          }, C.ANIM_TOTAL_MS);

          // Send state hash for consistency
          const allShots = [...state.players[0]!.shots, ...state.players[1]!.shots, shot];
          const hash = await computeStateHash(allShots);
          transport.send({ type: "stateHash", seq: msg.seq + 1, hash });
          break;
        }

        case "stateHash": {
          const allShots = [...state.players[0]!.shots, ...state.players[1]!.shots];
          const myHash = await computeStateHash(allShots);
          if (allShots.length > 0 && myHash !== msg.hash) {
            setSyncError(true);
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
  // Only re-subscribe when transport changes (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, peerRole]);

  // ── Disconnect countdown ────────────────────────────────────────────────────
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

  // Lobby — handled entirely inside GameLobby, which dispatches ADVANCE_FROM_LOBBY
  if (phase === "Lobby") return <GameLobby />;

  if (phase === "GameOver") {
    return <GameOverScreen viewingPlayerId={myPlayerId} />;
  }

  // Setup — deployment
  if (phase === "Setup" && !myDeployed) {
    return (
      <UnitDeployment
        playerId={myPlayerId}
        onReady={() => {
          // Tell opponent we deployed
          transport?.send({ type: "ready", skinId: "notebook", inkColor: "#1a1a2e", seq: 1 });
          setMyDeployed(true);
          // Lock our own layout; once both locked the reducer transitions to Aiming
          dispatch({ type: "LOCK_LAYOUT", playerId: myPlayerId });
        }}
      />
    );
  }

  // Waiting for opponent to deploy
  if (phase === "Setup" && myDeployed && !opponentDeployed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--pw-bg)] p-6">
        <div className="text-5xl mb-4" aria-hidden="true">📄</div>
        <h2 className="text-xl font-bold mb-2">Waiting for opponent…</h2>
        <p className="text-[var(--pw-text-muted)] text-sm">
          Your army is placed. Waiting for your opponent to finish deploying.
        </p>
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
          <Button variant="danger" onClick={() => { dispatch({ type: "GAME_OVER", winner: myPlayerId }); }}>
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
            The game states have diverged. This may be a network issue.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setSyncError(false)}>Continue Anyway</Button>
            <Button variant="danger" onClick={() => { dispatch({ type: "RETURN_TO_MENU" }); router.push("/"); }}>
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
        <Button variant="ghost" onClick={() => setShowPause(true)} aria-label="Pause" className="text-xl">⏸</Button>
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
