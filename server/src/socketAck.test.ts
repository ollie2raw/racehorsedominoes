import { describe, expect, it, vi } from "vitest";

import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("does not throw when the acknowledgement callback is omitted", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends the payload when an acknowledgement callback is provided", () => {
    const cb = vi.fn();

    sendAck(cb, { ok: false, error: "boom" });

    expect(cb).toHaveBeenCalledWith({ ok: false, error: "boom" });
  });
});
