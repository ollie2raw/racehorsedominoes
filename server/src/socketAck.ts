type AckCallback<T> = ((response: T) => void) | undefined;

export function sendAck<T>(cb: AckCallback<T>, response: T): void {
  if (typeof cb === "function") {
    cb(response);
  }
}
