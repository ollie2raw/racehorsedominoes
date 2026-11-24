import { describe, expect, it, vi } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("sends responses when an acknowledgement callback is provided", () => {
    const cb = vi.fn();

    sendAck(cb, { ok: true });

    expect(cb).toHaveBeenCalledWith({ ok: true });
  });

  it("ignores missing acknowledgement callbacks", () => {
    expect(() => sendAck(undefined, { ok: false })).not.toThrow();
  });
});
