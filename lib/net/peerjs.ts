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

export class PeerJSTransport implements Transport {
  // PeerJS has no official TS types — using any is necessary here
  private peer: any = null;
  private conn: any = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
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

  async connect(roomCode: string, role: "host" | "guest"): Promise<void> {
    const { Peer } = await import("peerjs");
    this.setStatus("connecting");
    if (role === "host") {
      await this.connectAsHost(Peer, roomCode);
    } else {
      await this.connectAsGuest(Peer, roomCode);
    }
  }

  private async connectAsHost(Peer: any, roomCode: string, attempt = 0): Promise<void> {
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
        this.setStatus("connected");
        resolve();
      });

      peer.on("connection", (conn: unknown) => {
        this.conn = conn;
        (conn as any).on("data", (data: unknown) => this.handleData(data));
        (conn as any).on("close", () => this.setStatus("reconnecting"));
      });

      peer.on("disconnected", () => this.setStatus("reconnecting"));
    });
  }

  private async connectAsGuest(Peer: any, roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;

      peer.on("open", () => {
        const hostId = `${C.PEER_ID_PREFIX}${roomCode}`;
        const conn = peer.connect(hostId, { reliable: true });
        this.conn = conn;

        conn.on("open", () => {
          this.setStatus("connected");
          this.send({ type: "hello", version: PROTOCOL_VERSION, seq: this.nextSeq() });
          resolve();
        });

        conn.on("data", (data: unknown) => this.handleData(data));
        conn.on("close", () => this.setStatus("reconnecting"));
        conn.on("error", reject);
      });

      peer.on("error", reject);
      peer.on("disconnected", () => this.setStatus("reconnecting"));
    });
  }

  private nextSeq(): number {
    return ++this.seqSent;
  }

  send(message: NetMessage): void {
    if (!this.conn?.open) {
      console.warn("[PeerJS] Cannot send: no open connection");
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
