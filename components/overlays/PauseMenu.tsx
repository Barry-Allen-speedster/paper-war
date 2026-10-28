"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@hooks/useGameStore";
import { Button } from "@components/ui/Button";
import { SettingsDrawer } from "@components/ui/SettingsDrawer";
import { Modal } from "@components/ui/Modal";
import { t } from "@lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PauseMenu({ open, onClose }: Props) {
  const router = useRouter();
  const { dispatch } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  function handleMenu() {
    dispatch({ type: "RETURN_TO_MENU" });
    router.push("/");
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Paused">
        <div className="flex flex-col gap-3">
          <Button onClick={onClose}>{t("shared.resume")}</Button>
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            {t("settings.title")}
          </Button>
          <Button variant="danger" onClick={handleMenu}>
            {t("shared.leave")}
          </Button>
        </div>
      </Modal>
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
