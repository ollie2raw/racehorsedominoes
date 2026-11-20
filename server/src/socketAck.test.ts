import { describe, expect, it } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("does nothing when the client omitted an acknowledgement callback", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends payloads to acknowledgement callbacks", () => {
    let received: unknown;

    sendAck(payload => {
      received = payload;
    }, { ok: false, error: "boom" });

    expect(received).toEqual({ ok: false, error: "boom" });
  });
});
