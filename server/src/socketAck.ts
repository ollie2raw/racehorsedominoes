export type AckCallback<T> = ((payload: T) => void) | undefined;

export function sendAck<T>(cb: AckCallback<T>, payload: T): void {
  if (typeof cb === "function") {
    cb(payload);
  }
}
