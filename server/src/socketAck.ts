export type AckPayload = Record<string, unknown>;
export type AckCallback = ((payload: AckPayload) => void) | undefined;

export function sendAck(cb: AckCallback, payload: AckPayload): void {
  if (typeof cb === "function") {
    cb(payload);
  }
}
