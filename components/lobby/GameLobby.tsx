"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNetStore } from "@hooks/useNetStore";
import { useGameStore } from "@hooks/useGameStore";
import { PeerJSTransport } from "@lib/net/peerjs";
import { Button } from "@components/ui/Button";
import { ConnectionBadge } from "./ConnectionBadge";
import { t } from "@lib/i18n";
import { Copy } from "lucide-react";

interface Props {
  /** If provided, auto-join as guest with this code (from /join/[code] deep link) */
  initialCode?: string;
}

type Screen = "pick" | "hosting" | "joining";

export function GameLobby({ initialCode }: Props) {
  const router = useRouter();
  const { setTransport, setConnectionStatus, setRoomCode, setPeerRole, reset, roomCode, connectionStatus } =
    useNetStore();
  const { dispatch } = useGameStore();

  // If arriving via deep link, skip straight to joining
  const [screen, setScreen] = useState<Screen>(initialCode ? "joining" : "pick");
  const [guestCode, setGuestCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareLink =
    typeof window !== "undefined" && roomCode
      ? `${window.location.origin}/join/${roomCode}`
      : "";

  // ── Host ────────────────────────────────────────────────────────────────────
  const startAsHost = useCallback(async () => {
    setError(null);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const transport = new PeerJSTransport();
    transport.onStatus((s) => setConnectionStatus(s));
    try {
      await transport.connect(code, "host");
      setTransport(transport);
      setRoomCode(code);
      setPeerRole("host");
      setScreen("hosting");
    } catch (err) {
      setError("Could not create room. Check your connection and try again.");
      console.error(err);
    }
  }, [setConnectionStatus, setTransport, setRoomCode, setPeerRole]);

  // ── Guest ───────────────────────────────────────────────────────────────────
  const joinAsGuest = useCallback(async () => {
    const code = guestCode.trim();
    if (code.length !== 4) return;
    setError(null);
    const transport = new PeerJSTransport();
    transport.onStatus((s) => setConnectionStatus(s));
    try {
      await transport.connect(code, "guest");
      setTransport(transport);
      setRoomCode(code);
      setPeerRole("guest");
      // Stay on joining screen — show connection status
    } catch {
      setError("Room not found. Make sure your friend's code is correct.");
    }
  }, [guestCode, setConnectionStatus, setTransport, setRoomCode, setPeerRole]);

  // Auto-join when arriving via deep link
  useEffect(() => {
    if (initialCode) {
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
    void navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleStartGame() {
    const myRole = screen === "hosting" ? "host" : "guest";
    dispatch({ type: "LOCK_LAYOUT", playerId: myRole === "host" ? "p1" : "p2" });
    router.push("/play/online");
  }

  function handleBack() {
    reset();
    setScreen("pick");
    setError(null);
    setGuestCode("");
  }

  function handleCancel() {
    reset();
    router.push("/");
  }

  // ── SCREEN: Pick host or join ────────────────────────────────────────────────
  if (screen === "pick") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
        <h1 className="text-3xl font-bold mb-2">Online</h1>
        <p className="text-[var(--pw-text-muted)] text-sm mb-10 text-center max-w-xs">
          One player hosts and shares a 4-digit code. The other enters it to join.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button
            onClick={() => void startAsHost()}
            className="w-full py-5 text-lg"
          >
            🏠 Create a Room
          </Button>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--pw-border)]" />
            <span className="text-xs text-[var(--pw-text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--pw-border)]" />
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-center">Enter a room code</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              className="w-full text-center text-4xl font-bold tracking-[0.5em] border-2 border-[var(--pw-border)] rounded-xl p-4 bg-[var(--pw-surface)] mb-3 focus:border-[var(--pw-accent)] outline-none"
              onKeyDown={(e) => { if (e.key === "Enter" && guestCode.length === 4) { setScreen("joining"); void joinAsGuest(); } }}
            />
            <Button
              onClick={() => { setScreen("joining"); void joinAsGuest(); }}
              disabled={guestCode.length !== 4}
              variant="secondary"
              className="w-full py-4 text-lg"
            >
              🚀 Join Room
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-500 text-red-400 text-sm text-center max-w-xs">
            {error}
          </div>
        )}

        <Button variant="ghost" onClick={handleCancel} className="mt-6 text-sm">
          ← Back to Menu
        </Button>
      </div>
    );
  }

  // ── SCREEN: Hosting — show code to share ────────────────────────────────────
  if (screen === "hosting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
        <h1 className="text-2xl font-bold mb-2">Share this code</h1>
        <p className="text-[var(--pw-text-muted)] text-sm mb-8 text-center max-w-xs">
          Tell your friend to go to the Online tab and enter this code.
        </p>

        {/* Big code display */}
        {roomCode ? (
          <div className="text-8xl font-bold tracking-[0.3em] text-[var(--pw-accent)] mb-6 font-game select-all">
            {roomCode}
          </div>
        ) : (
          <div className="text-[var(--pw-text-muted)] mb-6 animate-pulse">Generating code…</div>
        )}

        {/* Copy buttons */}
        <div className="flex gap-3 mb-8">
          <Button variant="secondary" onClick={copyCode} className="flex gap-2 items-center">
            <Copy size={16} />
            {copied ? "✓ Copied!" : "Copy Code"}
          </Button>
          {shareLink && (
            <Button variant="secondary" onClick={copyLink} className="flex gap-2 items-center">
              🔗 {copied ? "✓ Copied!" : "Copy Link"}
            </Button>
          )}
        </div>

        {/* Shareable link display */}
        {shareLink && (
          <div className="mb-8 px-4 py-3 bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-xl text-xs text-[var(--pw-text-muted)] max-w-sm text-center break-all">
            Or share this link:<br />
            <span className="font-mono text-[var(--pw-accent)]">{shareLink}</span>
          </div>
        )}

        <ConnectionBadge />

        {/* Status */}
        <div className="mt-6 mb-8 text-center">
          {connectionStatus === "connected" ? (
            <p className="text-green-500 font-semibold">✓ Friend connected!</p>
          ) : (
            <p className="text-[var(--pw-text-muted)] text-sm animate-pulse">
              Waiting for friend to join…
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleStartGame}
            disabled={connectionStatus !== "connected"}
            className="px-8"
          >
            Start Game →
          </Button>
          <Button variant="ghost" onClick={handleBack} className="text-sm">
            Cancel
          </Button>
        </div>

        {error && (
          <div role="alert" className="mt-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-500 text-red-400 text-sm text-center max-w-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── SCREEN: Joining — waiting for connection ─────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
      <h1 className="text-2xl font-bold mb-2">Joining room {guestCode || initialCode}</h1>
      <p className="text-[var(--pw-text-muted)] text-sm mb-8 text-center max-w-xs">
        Connecting to your friend&apos;s room…
      </p>

      <ConnectionBadge />

      <div className="mt-6 mb-8 text-center">
        {connectionStatus === "connected" ? (
          <p className="text-green-500 font-semibold">✓ Connected to host!</p>
        ) : connectionStatus === "connecting" ? (
          <p className="text-[var(--pw-text-muted)] animate-pulse">Connecting…</p>
        ) : (
          <p className="text-red-400">Connection failed.</p>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 px-4 py-3 rounded-lg bg-red-900/20 border border-red-500 text-red-400 text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleStartGame}
          disabled={connectionStatus !== "connected"}
          className="px-8"
        >
          Start Game →
        </Button>
        <Button variant="ghost" onClick={handleBack} className="text-sm">
          ← Back
        </Button>
      </div>
    </div>
  );
}
