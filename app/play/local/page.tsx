"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@hooks/useGameStore";
import { UnitDeployment } from "@components/deployment/UnitDeployment";
import { BattlefieldScreen } from "@components/battlefield/BattlefieldScreen";
import { TurnControllerOverlay } from "@components/overlays/TurnControllerOverlay";
import { GameOverScreen } from "@components/overlays/GameOverScreen";
import { PauseMenu } from "@components/overlays/PauseMenu";
import { ErrorBoundary } from "@components/ui/ErrorBoundary";
import { ToastProvider } from "@components/ui/Toast";
import { Button } from "@components/ui/Button";
import { t } from "@lib/i18n";

type DeployStep = "p1-deploy" | "p2-deploy" | "playing";

export default function LocalGamePage() {
  const router = useRouter();
  const { gameState } = useGameStore();
  const [deployStep, setDeployStep] = useState<DeployStep>("p1-deploy");
  const [showPause, setShowPause] = useState(false);

  const { phase } = gameState;

  // Client-side redirect
  useEffect(() => {
    if (phase === "MainMenu") router.push("/");
  }, [phase, router]);

  // Reset on rematch
  useEffect(() => {
    if (phase === "Setup") setDeployStep("p1-deploy");
  }, [phase]);

  if (phase === "MainMenu") return null;

  if (phase === "GameOver") {
    return (
      <ErrorBoundary>
        <ToastProvider>
          <GameOverScreen viewingPlayerId="p1" />
        </ToastProvider>
      </ErrorBoundary>
    );
  }

  if (phase === "Setup") {
    if (deployStep === "p1-deploy") {
      return (
        <ErrorBoundary>
          {/* No privacy screen — armies are visible. Just a simple header. */}
          <UnitDeployment playerId="p1" onReady={() => setDeployStep("p2-deploy")} />
        </ErrorBoundary>
      );
    }

    if (deployStep === "p2-deploy") {
      return (
        <ErrorBoundary>
          <UnitDeployment playerId="p2" onReady={() => setDeployStep("playing")} />
        </ErrorBoundary>
      );
    }

    // Safety fallback
    return (
      <ErrorBoundary>
        <UnitDeployment playerId="p1" onReady={() => setDeployStep("p2-deploy")} />
      </ErrorBoundary>
    );
  }

  // Playing
  return (
    <ErrorBoundary>
      <ToastProvider>
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
          <BattlefieldScreen viewingPlayerId={gameState.currentPlayerId} />
          <TurnControllerOverlay viewingPlayerId={gameState.currentPlayerId} />
          <PauseMenu open={showPause} onClose={() => setShowPause(false)} />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
