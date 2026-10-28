/**
 * Tiny browser-safe unique ID generator.
 * Used for Shot IDs. Not cryptographically secure.
 */
export function nanoid(size = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const randomValues = typeof crypto !== "undefined"
    ? crypto.getRandomValues(new Uint8Array(size))
    : new Uint8Array(size).map(() => Math.floor(Math.random() * 256));

  for (let i = 0; i < size; i++) {
    id += chars[randomValues[i]! % chars.length];
  }
  return id;
}
