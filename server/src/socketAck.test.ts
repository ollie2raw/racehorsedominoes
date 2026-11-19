import { describe, expect, it, vi } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("does nothing when the client omitted an acknowledgement callback", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends payloads to valid acknowledgement callbacks", () => {
    const cb = vi.fn();

    sendAck(cb, { ok: false, error: "boom" });

    expect(cb).toHaveBeenCalledWith({ ok: false, error: "boom" });
  });
});
