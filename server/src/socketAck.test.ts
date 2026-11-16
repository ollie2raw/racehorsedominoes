import { describe, expect, it } from "vitest";
import { registerSocketHandlers } from "./index";
import * as socketAck from "./socketAck";

describe("socket acknowledgements", () => {
  it("allows handlers to respond when no acknowledgement callback was supplied", () => {
    const sendAck = (socketAck as any).sendAck;

    expect(sendAck).toBeTypeOf("function");
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("passes responses to acknowledgement callbacks when present", () => {
    const sendAck = (socketAck as any).sendAck;
    const responses: unknown[] = [];

    sendAck((payload: unknown) => responses.push(payload), { ok: false, error: "boom" });

    expect(responses).toEqual([{ ok: false, error: "boom" }]);
  });

  it("does not throw from a Socket.IO handler when the ack callback is omitted", () => {
    const handlers = new Map<string, (...args: any[]) => void>();
    const joinedRooms: string[] = [];
    const socket = {
      id: "handler-no-ack",
      join: (roomCode: string) => {
        joinedRooms.push(roomCode);
      },
      on: (event: string, handler: (...args: any[]) => void) => {
        handlers.set(event, handler);
      },
    };

    registerSocketHandlers(socket as any);

    expect(() => handlers.get("room:create")?.({}, undefined)).not.toThrow();
    expect(joinedRooms).toHaveLength(1);
  });
});
