"use client";
/**
 * GameLobby — online multiplayer lobby.
 *
 * Flow:
 *   Both players land here from /play/online (phase === "Lobby").
 *   Host: creates a Supabase Realtime room, waits for guest to join, then clicks Start.
 *   Guest: enters the 6-digit code, connects to host, waits for host to start.
 *
 * When the host clicks Start:
 *   1. Host dispatches ADVANCE_FROM_LOBBY → phase becomes Setup.
 *   2. Host sends { type: "startGame" } to guest.
 *   3. Guest receives it → dispatches ADVANCE_FROM_LOBBY → phase becomes Setup.
 *   Both sides now render UnitDeployment in online/page.tsx.
 */
import { useState, useEffect, useRef } from "react";
import { useNetStore } from "@hooks/useNetStore";
import { useGameStore } from "@hooks/useGameStore";
import { SupabaseTransport } from "@lib/net/supabase";
import { Button } from "@components/ui/Button";
import { Copy } from "lucide-react";

interface Props {
  /** Pre-filled code when arriving via /join/[code] deep link */
  initialCode?: string;
}

type Screen = "pick" | "hosting" | "joining";

export function GameLobby({ initialCode }: Props) {
  const { setTransport, setConnectionStatus, setRoomCode, setPeerRole, reset, roomCode, connectionStatus } =
    useNetStore();
  const { dispatch } = useGameStore();

  const [screen, setScreen] = useState<Screen>(initialCode ? "joining" : "pick");
  const [guestInput, setGuestInput] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const transportRef = useRef<SupabaseTransport | null>(null);

  const shareLink =
    typeof window !== "undefined" && roomCode
      ? `${window.location.origin}/join/${roomCode}`
      : "";

  // Cleanup transport on unmount
  useEffect(() => {
    return () => {
      // Only reset if we haven't started the game
      // (if we did start, transport stays alive for the game)
    };
  }, []);

  // ── Host ─────────────────────────────────────────────────────────────────────
  async function startAsHost() {
    setError(null);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const transport = new SupabaseTransport();
    transportRef.current = transport;

    transport.onStatus((s) => {
      setConnectionStatus(s);
    });

    try {
      const actualCode = await transport.connect(code, "host");
      setTransport(transport);
      setRoomCode(actualCode);
      setPeerRole("host");
      setScreen("hosting");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Could not create room: ${message}`);
      console.error(err);
    }
  }

  // ── Guest ────────────────────────────────────────────────────────────────────
  async function joinAsGuest(code: string) {
    if (code.length !== 6) return;
    setError(null);

    const transport = new SupabaseTransport();
    transportRef.current = transport;

    // Register before joining so an immediate host start cannot beat the
    // lobby's React effect subscription.
    transport.onMessage((msg) => {
      if (msg.type === "startGame") dispatch({ type: "ADVANCE_FROM_LOBBY" });
    });

    transport.onStatus((s) => setConnectionStatus(s));

    try {
      await transport.connect(code, "guest");
      setTransport(transport);
      setRoomCode(code);
      setPeerRole("guest");
      // Stay on "joining" screen — wait for host to send startGame
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Could not connect: ${msg}. Check the code and try again.`);
      setScreen("pick");
    }
  }

  // ── Auto-join from deep link ─────────────────────────────────────────────────
  useEffect(() => {
    if (initialCode) void joinAsGuest(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Host starts the game ─────────────────────────────────────────────────────
  function handleHostStart() {
    const transport = transportRef.current;
    if (!transport) return;
    // Tell guest to start
    transport.send({ type: "startGame", seq: 1 });
    // Host advances locally
    dispatch({ type: "ADVANCE_FROM_LOBBY" });
  }

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

  function handleBack() {
    transportRef.current?.disconnect();
    transportRef.current = null;
    reset();
    setScreen("pick");
    setError(null);
    setGuestInput("");
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SCREEN: Pick
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === "pick") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
        <h1 className="text-3xl font-bold mb-2">Online</h1>
        <p className="text-[var(--pw-text-muted)] text-sm mb-10 text-center max-w-xs">
          Host creates a room and shares the code. The other player enters it to join.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          {/* Create room */}
          <Button onClick={() => void startAsHost()} className="w-full py-5 text-lg">
            🏠 Create a Room
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--pw-border)]" />
            <span className="text-xs text-[var(--pw-text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--pw-border)]" />
          </div>

          {/* Enter code */}
          <p className="text-sm font-medium text-center">Enter room code to join</p>
          <input
            type="text"
            inputMode="numeric"
          maxLength={6}
            value={guestInput}
            onChange={(e) => setGuestInput(e.target.value.replace(/\D/g, ""))}
            placeholder="1 2 3 4"
            autoFocus
            className="w-full text-center text-5xl font-bold tracking-[0.5em] border-2 border-[var(--pw-border)] rounded-xl p-4 bg-[var(--pw-surface)] focus:border-[var(--pw-accent)] outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && guestInput.length === 6) {
                setScreen("joining");
                void joinAsGuest(guestInput);
              }
            }}
          />
          <Button
            onClick={() => { setScreen("joining"); void joinAsGuest(guestInput); }}
            disabled={guestInput.length !== 6}
            variant="secondary"
            className="w-full py-4 text-lg"
          >
            🚀 Join Room
          </Button>
        </div>

        {error && (
          <div role="alert" className="mt-4 px-4 py-3 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm text-center max-w-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SCREEN: Hosting — show code, wait for guest, then host starts
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === "hosting") {
    const guestConnected = connectionStatus === "connected";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
        <h1 className="text-2xl font-bold mb-2">Share this code</h1>
        <p className="text-[var(--pw-text-muted)] text-sm mb-8 text-center max-w-xs">
          Tell your friend to open Paper War, tap Online, and enter this code.
        </p>

        {/* Big code */}
        {roomCode ? (
          <div className="text-6xl font-bold tracking-[0.25em] text-[var(--pw-accent)] mb-6 select-all">
            {roomCode}
          </div>
        ) : (
          <div className="text-[var(--pw-text-muted)] animate-pulse mb-6">Generating…</div>
        )}

        {/* Copy buttons */}
        <div className="flex gap-2 mb-6">
          <Button variant="secondary" onClick={copyCode} className="flex gap-2 items-center">
            <Copy size={15} />
            {copied ? "✓ Copied!" : "Copy Code"}
          </Button>
          {shareLink && (
            <Button variant="secondary" onClick={copyLink} className="flex gap-2 items-center text-sm">
              🔗 Copy Link
            </Button>
          )}
        </div>

        {/* Shareable URL */}
        {shareLink && (
          <p className="text-xs text-[var(--pw-text-muted)] mb-8 text-center break-all max-w-sm">
            {shareLink}
          </p>
        )}

        {/* Connection status */}
        <div className="mb-8 text-center">
          {guestConnected ? (
            <div className="flex items-center gap-2 text-green-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              Friend connected! Ready to start.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[var(--pw-text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block animate-pulse" />
              Waiting for your friend to join…
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleHostStart}
            disabled={!guestConnected}
            className="px-10 py-3 text-base"
          >
            Start Game →
          </Button>
          <Button variant="ghost" onClick={handleBack} className="text-sm">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SCREEN: Joining — connecting, then waiting for host to start
  // ────────────────────────────────────────────────────────────────────────────
  const joinedCode = guestInput || initialCode || "?";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--pw-bg)]">
      <h1 className="text-2xl font-bold mb-2">Joining room</h1>

      <div className="text-6xl font-bold tracking-[0.25em] text-[var(--pw-accent)] mb-8">
        {joinedCode}
      </div>

      <div className="mb-8 text-center">
        {connectionStatus === "connected" ? (
          <div>
            <div className="flex items-center gap-2 text-green-600 font-semibold mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              Connected!
            </div>
            <p className="text-[var(--pw-text-muted)] text-sm animate-pulse">
              Waiting for the host to start the game…
            </p>
          </div>
        ) : connectionStatus === "connecting" ? (
          <div className="flex items-center gap-2 text-[var(--pw-text-muted)]">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block animate-pulse" />
            Connecting… (retrying automatically if needed)
          </div>
        ) : (
          <div className="text-red-500">Connection failed.</div>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 px-4 py-3 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      <Button variant="ghost" onClick={handleBack} className="text-sm">
        ← Back
      </Button>
    </div>
  );
}
