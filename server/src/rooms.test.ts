import { describe, expect, it } from "vitest";

import { createRoom, joinRoom, nextHand, startGame } from "./rooms";

describe("room lifecycle controls", () => {
  it("rejects game starts from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow("not a player");
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    if (!room.state) {
      throw new Error("expected game state");
    }

    room.state = {
      ...room.state,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state.players,
        host: { ...room.state.players.host, score: 25 },
        guest: { ...room.state.players.guest, score: 10 },
      },
    };

    expect(() => startGame(room.code, "guest")).toThrow("next hand");
    expect(room.state.players.host.score).toBe(25);
    expect(room.state.players.guest.score).toBe(10);
  });

  it("rejects next-hand requests from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    if (!room.state) {
      throw new Error("expected game state");
    }

    room.state = {
      ...room.state,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow("not a player");
  });
});
