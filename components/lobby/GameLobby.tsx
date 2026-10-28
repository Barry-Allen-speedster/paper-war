"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNetStore } from "@hooks/useNetStore";
import { useGameStore } from "@hooks/useGameStore";
import { PeerJSTransport } from "@lib/net/peerjs";
import { Button } from "@components/ui/Button";
import { ConnectionBadge } from "./ConnectionBadge";
import { t } from "@lib/i18n";
import { Copy, Share2 } from "lucide-react";

interface Props {
  /** If provided, auto-join as guest with this code */
  initialCode?: string;
}

export function GameLobby({ initialCode }: Props) {
  const router = useRouter();
  const { setTransport, setConnectionStatus, setRoomCode, setPeerRole, reset, roomCode, connectionStatus } =
    useNetStore();
  const { dispatch } = useGameStore();

  const [role, setRole] = useState<"host" | "guest" | null>(initialCode ? "guest" : null);
  const [guestCode, setGuestCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hostReady, setHostReady] = useState(false);
  const [guestReady, setGuestReady] = useState(false);

  const shareLink =
    typeof window !== "undefined" && roomCode
      ? `${window.location.origin}/join/${roomCode}`
      : "";

  const startAsHost = useCallback(async () => {
    setRole("host");
    setError(null);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const transport = new PeerJSTransport();

    transport.onStatus((s) => setConnectionStatus(s));

    try {
      await transport.connect(code, "host");
      setTransport(transport);
      setRoomCode(code);
      setPeerRole("host");
    } catch (err) {
      setError(t("lobby.error.generic"));
      console.error(err);
    }
  }, [setConnectionStatus, setTransport, setRoomCode, setPeerRole]);

  const joinAsGuest = useCallback(async () => {
    if (guestCode.length !== 4) return;
    setRole("guest");
    setError(null);
    const transport = new PeerJSTransport();
    transport.onStatus((s) => setConnectionStatus(s));

    try {
      await transport.connect(guestCode, "guest");
      setTransport(transport);
      setRoomCode(guestCode);
      setPeerRole("guest");
    } catch {
      setError(t("lobby.error.notFound"));
    }
  }, [guestCode, setConnectionStatus, setTransport, setRoomCode, setPeerRole]);

  // Auto-host on mount if no initial code
  useEffect(() => {
    if (!initialCode) {
      void startAsHost();
    } else {
      void joinAsGuest();
    }
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyCode() {
    if (!roomCode) return;
    void navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyLink() {
    if (!shareLink) return;
    void navigator.clipboard.writeText(shareLink);
  }

  function handleCancel() {
    reset();
    router.push("/");
  }

  function handleReady() {
    if (role === "host") setHostReady(true);
    else setGuestReady(true);
    // Transition to Setup
    dispatch({ type: "LOCK_LAYOUT", playerId: role === "host" ? "p1" : "p2" });
    router.push("/play/online");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
      <h1 className="text-3xl font-bold mb-8">{t("lobby.title")}</h1>

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-500 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Room code display (host) */}
      {role === "host" && roomCode && (
        <div className="text-center mb-8">
          <p className="text-[var(--pw-text-muted)] text-sm mb-3">{t("lobby.host.instruction")}</p>
          <div className="text-6xl font-bold tracking-[0.3em] text-[var(--pw-accent)] mb-4 font-game">
            {roomCode}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={copyCode} className="flex gap-2 items-center">
              <Copy size={16} />
              {copied ? "Copied!" : t("lobby.copy")}
            </Button>
            {shareLink && (
              <Button variant="secondary" onClick={copyLink} className="flex gap-2 items-center">
                <Share2 size={16} />
                {t("lobby.share")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Code entry (guest without initialCode) */}
      {!initialCode && !role && (
        <div className="mb-8 w-full max-w-xs">
          <p className="text-[var(--pw-text-muted)] text-sm mb-3">{t("lobby.guest.instruction")}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={guestCode}
            onChange={(e) => setGuestCode(e.target.value.replace(/\D/g, ""))}
            placeholder={t("lobby.code.placeholder")}
            className="w-full text-center text-3xl tracking-widest border-2 border-[var(--pw-border)] rounded-lg p-3 bg-[var(--pw-surface)] mb-3 focus:border-[var(--pw-accent)] outline-none"
          />
          <Button onClick={() => void joinAsGuest()} disabled={guestCode.length !== 4} className="w-full">
            {t("lobby.join")}
          </Button>
        </div>
      )}

      {/* Connection status */}
      <div className="mb-6">
        <ConnectionBadge />
      </div>

      {/* Player ready states */}
      <div className="flex gap-8 mb-8">
        {(["p1", "p2"] as const).map((pid, i) => (
          <div key={pid} className="text-center">
            <p className="text-sm text-[var(--pw-text-muted)] mb-1">
              {i === 0 ? t("shared.player1") : t("shared.player2")}
            </p>
            <div className={`text-2xl ${(i === 0 ? hostReady : guestReady) ? "text-green-500" : "text-[var(--pw-border)]"}`}>
              {(i === 0 ? hostReady : guestReady) ? "✓" : "○"}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleReady}
          disabled={connectionStatus !== "connected"}
        >
          {t("lobby.ready")}
        </Button>
        <Button variant="ghost" onClick={handleCancel}>
          {t("lobby.cancel")}
        </Button>
      </div>
    </div>
  );
}
