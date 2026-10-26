import { describe, expect, it } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("does nothing when the client omits an acknowledgement callback", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends the payload when an acknowledgement callback is present", () => {
    const calls: unknown[] = [];

    sendAck((payload) => calls.push(payload), { ok: false, error: "boom" });

    expect(calls).toEqual([{ ok: false, error: "boom" }]);
  });
});
