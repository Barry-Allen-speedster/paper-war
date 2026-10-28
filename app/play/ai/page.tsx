"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@hooks/useGameStore";
import { useAI } from "@hooks/useAI";
import { UnitDeployment } from "@components/deployment/UnitDeployment";
import { BattlefieldScreen } from "@components/battlefield/BattlefieldScreen";
import { TurnControllerOverlay } from "@components/overlays/TurnControllerOverlay";
import { GameOverScreen } from "@components/overlays/GameOverScreen";
import { PauseMenu } from "@components/overlays/PauseMenu";
import { ErrorBoundary } from "@components/ui/ErrorBoundary";
import { ToastProvider } from "@components/ui/Toast";
import { Button } from "@components/ui/Button";
import { t } from "@lib/i18n";

function AIGameInner() {
  useAI();
  const { gameState, dispatch } = useGameStore();
  const router = useRouter();
  const [showPause, setShowPause] = useState(false);
  const [p1Deployed, setP1Deployed] = useState(false);

  const { phase } = gameState;

  // Redirect client-side only
  useEffect(() => {
    if (phase === "MainMenu") router.push("/");
  }, [phase, router]);

  // Reset deploy state on rematch
  useEffect(() => {
    if (phase === "Setup") setP1Deployed(false);
  }, [phase]);

  if (phase === "MainMenu") return null;

  if (phase === "GameOver") {
    return <GameOverScreen viewingPlayerId="p1" />;
  }

  if (phase === "Setup" && !p1Deployed) {
    return (
      <UnitDeployment
        playerId="p1"
        onReady={() => {
          // AI auto-places p2's army and locks immediately
          dispatch({ type: "RANDOMIZE_PLACEMENT", playerId: "p2" });
          dispatch({ type: "LOCK_LAYOUT", playerId: "p2" });
          setP1Deployed(true);
        }}
      />
    );
  }

  return (
    <div className="relative h-screen">
      <div className="absolute top-2 right-2 z-20">
        <Button
          variant="ghost"
          onClick={() => setShowPause(true)}
          aria-label={t("battle.pause")}
          className="text-xl"
        >
          ⏸
        </Button>
      </div>
      <BattlefieldScreen viewingPlayerId="p1" />
      <TurnControllerOverlay viewingPlayerId="p1" />
      <PauseMenu open={showPause} onClose={() => setShowPause(false)} />
    </div>
  );
}

export default function AIGamePage() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AIGameInner />
      </ToastProvider>
    </ErrorBoundary>
  );
}
