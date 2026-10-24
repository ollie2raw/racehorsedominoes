export type SocketAck<T = unknown> = (response: T) => void;

export function normalizeAck<T = unknown>(ack: unknown): SocketAck<T> {
  return typeof ack === "function" ? (ack as SocketAck<T>) : () => {};
}
