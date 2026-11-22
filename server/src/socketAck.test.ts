import { describe, expect, it, vi } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("calls acknowledgement callbacks when present", () => {
    const cb = vi.fn();

    sendAck(cb, { ok: true });

    expect(cb).toHaveBeenCalledWith({ ok: true });
  });

  it("ignores omitted acknowledgement callbacks", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });
});
