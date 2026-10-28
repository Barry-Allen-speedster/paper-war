/**
 * Network message types and Zod validation schemas — v0.2.
 * Simplified: no commitment, shotResult, or reveal messages.
 * Both clients compute shot results locally from shared state.
 * A stateHash message provides cheap consistency checking.
 */
import { z } from "zod";

const Vec2Schema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const HelloSchema = z.object({
  type: z.literal("hello"),
  version: z.string(),
  seq: z.number().int().nonnegative(),
});

/** Sent after both players are in the lobby to sync display preferences. */
const ReadySchema = z.object({
  type: z.literal("ready"),
  skinId: z.string(),
  inkColor: z.string(),
  seq: z.number().int().nonnegative(),
});

/** Attacker fires — both sides compute the result locally. */
const ShotSchema = z.object({
  type: z.literal("shot"),
  pos: Vec2Schema,
  shotId: z.string(),
  seq: z.number().int().nonnegative(),
});

/**
 * Lightweight consistency check after each shot.
 * hash = SHA-256 of the shot log JSON so both sides can verify they agree.
 */
const StateHashSchema = z.object({
  type: z.literal("stateHash"),
  seq: z.number().int().nonnegative(),
  hash: z.string(),
});

const RematchSchema = z.object({
  type: z.literal("rematch"),
  seq: z.number().int().nonnegative(),
});

const PingSchema = z.object({
  type: z.literal("ping"),
  seq: z.number().int().nonnegative(),
});

const PongSchema = z.object({
  type: z.literal("pong"),
  seq: z.number().int().nonnegative(),
});

const ForfeitSchema = z.object({
  type: z.literal("forfeit"),
  seq: z.number().int().nonnegative(),
});

export const NetMessageSchema = z.discriminatedUnion("type", [
  HelloSchema,
  ReadySchema,
  ShotSchema,
  StateHashSchema,
  RematchSchema,
  PingSchema,
  PongSchema,
  ForfeitSchema,
]);

export type NetMessage = z.infer<typeof NetMessageSchema>;

export function parseNetMessage(raw: unknown): NetMessage {
  return NetMessageSchema.parse(raw);
}

export function serializeNetMessage(msg: NetMessage): string {
  return JSON.stringify(msg);
}

export function deserializeNetMessage(raw: string): NetMessage {
  return parseNetMessage(JSON.parse(raw));
}

export const PROTOCOL_VERSION = "2.0.0";

/**
 * Compute a lightweight state hash from the shot log.
 * Both clients run this after each shot — if hashes diverge, state has desynced.
 */
export async function computeStateHash(shots: import("../game/types").Shot[]): Promise<string> {
  const payload = JSON.stringify(shots.map((s) => ({ id: s.id, pos: s.pos, result: s.result })));
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
