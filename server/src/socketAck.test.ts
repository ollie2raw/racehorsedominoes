import { describe, expect, it } from "vitest";

import { normalizeAck } from "./socketAck";

describe("normalizeAck", () => {
  it("uses a no-op callback when a Socket.IO event omits the ack", () => {
    const ack = normalizeAck(undefined);

    expect(() => ack({ ok: false, error: "missing ack" })).not.toThrow();
  });

  it("preserves the callback when a Socket.IO event includes an ack", () => {
    let response: unknown;
    const ack = normalizeAck((payload) => {
      response = payload;
    });

    ack({ ok: true });

    expect(response).toEqual({ ok: true });
  });
});
