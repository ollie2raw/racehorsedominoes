import { describe, expect, it, vi } from "vitest";

import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("does nothing when the client omits an acknowledgement callback", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends the response when an acknowledgement callback exists", () => {
    const cb = vi.fn();

    sendAck(cb, { ok: false, error: "boom" });

    expect(cb).toHaveBeenCalledWith({ ok: false, error: "boom" });
  });
});
