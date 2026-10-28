"use client";
/**
 * Zustand network store.
 * Manages the Transport instance and connection state.
 */
import { create } from "zustand";
import type { Transport, ConnectionStatus } from "@lib/net/transport";

interface NetStore {
  transport: Transport | null;
  connectionStatus: ConnectionStatus;
  roomCode: string | null;
  peerRole: "host" | "guest" | null;

  setTransport: (t: Transport) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setRoomCode: (code: string) => void;
  setPeerRole: (role: "host" | "guest") => void;
  reset: () => void;
}

export const useNetStore = create<NetStore>((set, get) => ({
  transport: null,
  connectionStatus: "disconnected",
  roomCode: null,
  peerRole: null,

  setTransport(transport) { set({ transport }); },
  setConnectionStatus(connectionStatus) { set({ connectionStatus }); },
  setRoomCode(roomCode) { set({ roomCode }); },
  setPeerRole(peerRole) { set({ peerRole }); },

  reset() {
    get().transport?.disconnect();
    set({
      transport: null,
      connectionStatus: "disconnected",
      roomCode: null,
      peerRole: null,
    });
  },
}));
