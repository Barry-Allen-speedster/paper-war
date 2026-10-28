import { describe, it, expect } from "vitest";
import { parseNetMessage, serializeNetMessage } from "@lib/net/protocol";

describe("network protocol v0.2", () => {
  it("parses valid hello", () => {
    const msg = parseNetMessage({ type: "hello", version: "2.0.0", seq: 0 });
    expect(msg.type).toBe("hello");
  });

  it("parses valid shot", () => {
    const msg = parseNetMessage({ type: "shot", pos: { x: 0.5, y: 0.3 }, shotId: "abc", seq: 1 });
    expect(msg.type).toBe("shot");
    if (msg.type === "shot") expect(msg.pos.x).toBe(0.5);
  });

  it("parses valid ready with skinId and inkColor", () => {
    const msg = parseNetMessage({ type: "ready", skinId: "notebook", inkColor: "#333", seq: 0 });
    expect(msg.type).toBe("ready");
  });

  it("parses valid stateHash", () => {
    const msg = parseNetMessage({ type: "stateHash", seq: 2, hash: "a".repeat(64) });
    expect(msg.type).toBe("stateHash");
  });

  it("rejects shot with x > 1", () => {
    expect(() => parseNetMessage({ type: "shot", pos: { x: 1.5, y: 0.5 }, shotId: "x", seq: 0 })).toThrow();
  });

  it("rejects shot with x < 0", () => {
    expect(() => parseNetMessage({ type: "shot", pos: { x: -0.1, y: 0.5 }, shotId: "x", seq: 0 })).toThrow();
  });

  it("rejects unknown type", () => {
    expect(() => parseNetMessage({ type: "shotResult", seq: 0 })).toThrow();
  });

  it("rejects message missing seq", () => {
    expect(() => parseNetMessage({ type: "ping" })).toThrow();
  });

  it("serialize → parse round-trip", () => {
    const original = { type: "ping" as const, seq: 42 };
    const parsed = parseNetMessage(JSON.parse(serializeNetMessage(original)));
    expect(parsed.type).toBe("ping");
    expect(parsed.seq).toBe(42);
  });
});
