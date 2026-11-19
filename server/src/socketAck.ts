export function sendAck<T>(cb: unknown, payload: T): void {
  if (typeof cb === "function") {
    cb(payload);
  }
}
