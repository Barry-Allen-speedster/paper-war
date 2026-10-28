/**
 * Transport interface — the only network abstraction the game logic touches.
 * Swap PeerJSTransport for another implementation by satisfying this interface.
 */
import type { NetMessage } from "./protocol";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface Transport {
  /** Connect to (or create) a room. Returns the actual room code used (may differ from requested on collision retry). */
  connect(roomCode: string, role: "host" | "guest"): Promise<string>;
  /** Send a message to the peer. */
  send(message: NetMessage): void;
  /** Subscribe to incoming messages. Returns an unsubscribe function. */
  onMessage(handler: (message: NetMessage) => void): () => void;
  /** Subscribe to connection status changes. Returns an unsubscribe function. */
  onStatus(handler: (status: ConnectionStatus) => void): () => void;
  /** Close the connection and clean up. */
  disconnect(): void;
}
