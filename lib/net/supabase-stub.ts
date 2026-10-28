/**
 * Supabase Realtime transport stub.
 * Satisfies the Transport interface but throws NotImplementedError on all methods.
 *
 * To implement for real:
 * 1. Install @supabase/supabase-js
 * 2. Create a Supabase client with your project URL + anon key
 * 3. Replace each method body:
 *    connect:    subscribe to channel `paperwar-${roomCode}`, broadcast presence
 *    send:       channel.send({ type: "broadcast", event: "msg", payload: message })
 *    onMessage:  channel.on("broadcast", { event: "msg" }, ({ payload }) => handler(payload))
 *    onStatus:   channel.on("presence", { event: "sync" }, ...) + channel state
 *    disconnect: await channel.unsubscribe()
 */
import type { Transport, ConnectionStatus } from "./transport";
import type { NetMessage } from "./protocol";

class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `SupabaseStub.${method} is not implemented. ` +
      "See supabase-stub.ts for instructions on completing this transport."
    );
    this.name = "NotImplementedError";
  }
}

export class SupabaseStub implements Transport {
  connect(_roomCode: string, _role: "host" | "guest"): Promise<void> {
    throw new NotImplementedError("connect");
  }

  send(_message: NetMessage): void {
    throw new NotImplementedError("send");
  }

  onMessage(_handler: (message: NetMessage) => void): () => void {
    throw new NotImplementedError("onMessage");
  }

  onStatus(_handler: (status: ConnectionStatus) => void): () => void {
    throw new NotImplementedError("onStatus");
  }

  disconnect(): void {
    throw new NotImplementedError("disconnect");
  }
}
