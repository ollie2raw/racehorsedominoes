import { describe, expect, it } from "vitest";
import { sendAck } from "./socketAck";

describe("sendAck", () => {
  it("does not throw when the client omits the acknowledgement callback", () => {
    expect(() => sendAck(undefined, { ok: true })).not.toThrow();
  });

  it("sends the response when an acknowledgement callback is provided", () => {
    let response: { ok: boolean } | undefined;
    sendAck((value) => {
      response = value;
    }, { ok: true });

    expect(response).toEqual({ ok: true });
  });
});
