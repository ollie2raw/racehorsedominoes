export type AckCallback = (response: unknown) => void;

export function normalizeAck(cb: unknown): AckCallback {
  return typeof cb === "function" ? cb as AckCallback : () => {};
}
