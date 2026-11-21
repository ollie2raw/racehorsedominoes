import { describe, expect, it } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("ignores missing acknowledgement callbacks", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends payloads when an acknowledgement callback is present", () => {
    let received: Record<string, unknown> | null = null;
    sendAck(payload => {
      received = payload;
    }, { ok: false, error: "boom" });

    expect(received).toEqual({ ok: false, error: "boom" });
  });
});
