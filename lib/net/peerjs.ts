/**
 * PeerJS transport implementation.
 * Maps 4-digit room codes to peer IDs: paperwar-{code}
 * Host creates the peer; guest connects to host's peer ID.
 */
import type { Transport, ConnectionStatus } from "./transport";
import type { NetMessage } from "./protocol";
import { deserializeNetMessage, serializeNetMessage, PROTOCOL_VERSION } from "./protocol";
import { DEFAULT_CONFIG } from "../game/config";

const C = DEFAULT_CONFIG;

type MessageHandler = (message: NetMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;
type CodeHandler = (code: string) => void;

export class PeerJSTransport implements Transport {
  private peer: any = null;
  private conn: any = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  /** Fires with the actual room code (may differ from requested if there was a retry) */
  private codeHandlers: Set<CodeHandler> = new Set();
  private seqSent = 0;
  private seenSeqs = new Set<number>();

  private setStatus(s: ConnectionStatus): void {
    this.statusHandlers.forEach((h) => h(s));
  }

  private handleData(data: unknown): void {
    try {
      const msg = deserializeNetMessage(
        typeof data === "string" ? data : JSON.stringify(data)
      );
      if (this.seenSeqs.has(msg.seq)) return;
      this.seenSeqs.add(msg.seq);
      this.messageHandlers.forEach((h) => h(msg));
    } catch (err) {
      console.warn("[PeerJS] Invalid message discarded:", err);
    }
  }

  async connect(roomCode: string, role: "host" | "guest"): Promise<string> {
    const { Peer } = await import("peerjs");
    this.setStatus("connecting");
    if (role === "host") {
      return this.connectAsHost(Peer, roomCode);
    } else {
      await this.connectAsGuest(Peer, roomCode);
      return roomCode;
    }
  }

  private connectAsHost(Peer: any, roomCode: string, attempt = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      const peerId = `${C.PEER_ID_PREFIX}${roomCode}`;
      const peer = new Peer(peerId);
      this.peer = peer;

      peer.on("error", (err: { type: string }) => {
        if (err.type === "unavailable-id" && attempt < C.MAX_CODE_RETRIES) {
          peer.destroy();
          const newCode = String(Math.floor(1000 + Math.random() * 9000));
          this.connectAsHost(Peer, newCode, attempt + 1).then(resolve).catch(reject);
        } else {
          reject(new Error(`PeerJS error: ${err.type}`));
        }
      });

      peer.on("open", () => {
        // Host is registered — waiting for a guest; status is "connecting" until guest arrives
        resolve(roomCode); // surfaced actual code
      });

      peer.on("connection", (conn: unknown) => {
        this.conn = conn;
        (conn as any).on("data", (data: unknown) => this.handleData(data));
        (conn as any).on("open", () => {
          // Guest has fully connected — NOW we are "connected"
          this.setStatus("connected");
        });
        (conn as any).on("close", () => this.setStatus("reconnecting"));
      });

      peer.on("disconnected", () => this.setStatus("reconnecting"));
    });
  }

  private connectAsGuest(Peer: any, roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;

      const timeout = setTimeout(() => {
        reject(new Error("Connection timed out — is the room code correct?"));
      }, 15000);

      peer.on("open", () => {
        const hostId = `${C.PEER_ID_PREFIX}${roomCode}`;
        const conn = peer.connect(hostId, { reliable: true });
        this.conn = conn;

        conn.on("open", () => {
          clearTimeout(timeout);
          this.setStatus("connected");
          this.send({ type: "hello", version: PROTOCOL_VERSION, seq: this.nextSeq() });
          resolve();
        });

        conn.on("data", (data: unknown) => this.handleData(data));
        conn.on("close", () => this.setStatus("reconnecting"));
        conn.on("error", (e: Error) => {
          clearTimeout(timeout);
          reject(e);
        });
      });

      peer.on("error", (e: Error) => {
        clearTimeout(timeout);
        reject(e);
      });
      peer.on("disconnected", () => this.setStatus("reconnecting"));
    });
  }

  private nextSeq(): number {
    return ++this.seqSent;
  }

  send(message: NetMessage): void {
    if (!this.conn) {
      console.warn("[PeerJS] Cannot send: no connection yet");
      return;
    }
    // conn.open may be undefined before the connection fires "open"
    if (this.conn.open === false) {
      console.warn("[PeerJS] Cannot send: connection not open");
      return;
    }
    this.conn.send(serializeNetMessage(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  disconnect(): void {
    this.conn?.close();
    this.peer?.destroy();
    this.conn = null;
    this.peer = null;
    this.setStatus("disconnected");
  }
}
