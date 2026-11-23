export type SocketAck<T> = ((response: T) => void) | undefined;

export function sendAck<T>(cb: SocketAck<T>, response: T): void {
  if (typeof cb === "function") {
    cb(response);
  }
}
