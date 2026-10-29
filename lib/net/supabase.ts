/** Supabase Realtime relay transport for browser multiplayer. */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Transport, ConnectionStatus } from "./transport";
import { NetMessageSchema, type NetMessage } from "./protocol";

type MessageHandler = (message: NetMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class SupabaseTransport implements Transport {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private seq = 0;

  private setStatus(status: ConnectionStatus): void {
    this.statusHandlers.forEach((handler) => handler(status));
  }

  async connect(roomCode: string, role: "host" | "guest"): Promise<string> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !publishableKey) {
      throw new Error("Supabase is not configured. Add the project URL and publishable key to Vercel environment variables.");
    }

    this.setStatus("connecting");
    this.client = createClient(url, publishableKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });

    const channel = this.client.channel(`paperwar-${roomCode}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: role },
      },
    });
    this.channel = channel;
    channel
      .on("broadcast", { event: "game-message" }, ({ payload }) => {
        const parsed = NetMessageSchema.safeParse(payload);
        if (!parsed.success) {
          console.warn("[Supabase] Ignoring invalid game message", parsed.error);
          return;
        }
        this.messageHandlers.forEach((handler) => handler(parsed.data));
      });
    channel.on("presence", { event: "sync" }, () => {
      const roles = Object.values(channel.presenceState())
        .flat()
        .map((presence) => (presence as { role?: string }).role);
      this.setStatus(roles.includes("host") && roles.includes("guest") ? "connected" : "connecting");
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        void this.disconnect();
        reject(new Error("Timed out connecting to Supabase Realtime."));
      }, 20000);

      channel.subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          try {
            await channel.track({ role, joinedAt: Date.now() });
            const roles = Object.values(channel.presenceState())
              .flat()
              .map((presence) => (presence as { role?: string }).role);
            this.setStatus(roles.includes("host") && roles.includes("guest") ? "connected" : "connecting");
            resolve();
          } catch (trackError) {
            clearTimeout(timeout);
            this.setStatus("disconnected");
            reject(trackError instanceof Error ? trackError : new Error("Could not join room presence."));
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          this.setStatus("disconnected");
          reject(error instanceof Error ? error : new Error(`Supabase channel ${status.toLowerCase()}.`));
        } else if (status === "CLOSED") {
          this.setStatus("reconnecting");
        }
      });
    });

    return roomCode;
  }

  send(message: NetMessage): void {
    if (!this.channel) {
      console.warn("[Supabase] Cannot send: no room channel");
      return;
    }
    const sequenced = { ...message, seq: ++this.seq } as NetMessage;
    void this.channel.send({ type: "broadcast", event: "game-message", payload: sequenced })
      .then((result) => {
        if (result !== "ok") console.warn("[Supabase] Message was not acknowledged:", result);
      });
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
    const client = this.client;
    const channel = this.channel;
    this.channel = null;
    this.client = null;
    if (client && channel) void client.removeChannel(channel);
    this.setStatus("disconnected");
  }
}
