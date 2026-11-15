import { describe, expect, it } from "vitest";

describe("Socket.IO acknowledgement helper", () => {
  it("ignores missing acknowledgement callbacks", async () => {
    let mod: any = {};
    try {
      mod = await import("./socketAck");
    } catch {
      mod = {};
    }

    expect(typeof mod.sendAck).toBe("function");
    if (typeof mod.sendAck !== "function") return;

    expect(() => mod.sendAck(undefined, { ok: true })).not.toThrow();
  });
});
