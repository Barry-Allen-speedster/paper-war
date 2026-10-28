/**
 * PeerJS transport implementation.
 * Uses the default PeerJS cloud signaling server.
 */
import type { Transport, ConnectionStatus } from "./transport";
import type { NetMessage } from "./protocol";
import { deserializeNetMessage, serializeNetMessage, PROTOCOL_VERSION } from "./protocol";
import { DEFAULT_CONFIG } from "../game/config";

const C = DEFAULT_CONFIG;

type MessageHandler = (message: NetMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class PeerJSTransport implements Transport {
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
        } else if (err.type === "network" || err.type === "server-error") {
          // PeerJS server blip — retry once
          if (attempt < 2) {
            peer.destroy();
            setTimeout(() => {
              this.connectAsHost(Peer, roomCode, attempt + 1).then(resolve).catch(reject);
            }, 2000);
          } else {
            reject(new Error(`PeerJS error: ${err.type}`));
          }
        } else {
          reject(new Error(`PeerJS error: ${err.type}`));
        }
      });

      peer.on("open", () => {
        // Peer registered on signaling server — waiting for guest now
        // Status stays "connecting" until guest actually connects
        resolve(roomCode);
      });

      peer.on("connection", (conn: unknown) => {
        this.conn = conn;
        (conn as any).on("open", () => {
          // Guest data channel fully open — NOW we are truly connected
          this.setStatus("connected");
        });
        (conn as any).on("data", (data: unknown) => this.handleData(data));
        (conn as any).on("close", () => this.setStatus("reconnecting"));
      });

      peer.on("disconnected", () => this.setStatus("reconnecting"));
    });
  }

  private connectAsGuest(Peer: any, roomCode: string, attempt = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      this.peer = peer;

      // 25 second timeout — PeerJS can be slow on mobile
      const timeout = setTimeout(() => {
        peer.destroy();
        reject(new Error("Connection timed out — is the room code correct?"));
      }, 25000);

      peer.on("error", (e: { type: string; message?: string }) => {
        // Peer-unavailable means the host hasn't registered yet or wrong code
        // Retry up to 3 times with 2s delay
        if ((e.type === "peer-unavailable" || e.type === "network") && attempt < 3) {
          peer.destroy();
          clearTimeout(timeout);
          setTimeout(() => {
            this.connectAsGuest(Peer, roomCode, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 2000);
        } else {
          clearTimeout(timeout);
          peer.destroy();
          const msg = e.type === "peer-unavailable"
            ? "Room not found. Check the code and try again."
            : `Could not connect (${e.type}).`;
          reject(new Error(msg));
        }
      });

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
