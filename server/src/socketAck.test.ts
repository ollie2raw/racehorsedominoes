import { describe, expect, it, vi } from "vitest";
import { normalizeAck } from "./socketAck";

describe("normalizeAck", () => {
  it("returns the original acknowledgement callback when provided", () => {
    const cb = vi.fn();
    const ack = normalizeAck(cb);

    ack({ ok: true });

    expect(cb).toHaveBeenCalledWith({ ok: true });
  });

  it("returns a safe no-op when acknowledgement callback is omitted", () => {
    const ack = normalizeAck(undefined);

    expect(() => ack({ ok: false, error: "missing callback" })).not.toThrow();
  });
});
