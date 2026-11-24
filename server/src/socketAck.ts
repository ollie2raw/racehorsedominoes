export function sendAck(cb: unknown, response: unknown): void {
  if (typeof cb === "function") {
    cb(response);
  }
}
