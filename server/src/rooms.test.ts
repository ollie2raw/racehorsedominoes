import { describe, expect, it } from "vitest";

import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function hiddenTiles(count: number) {
  return Array.from({ length: count }, () => ({ high: -1, low: -1 }));
}

describe("rooms security and lifecycle guards", () => {
  it("only exposes a player's own hand while preserving hidden tile counts", () => {
    const room = createRoom("A");
    joinRoom(room.code, "B");
    startGame(room.code, "A");

    const raw = room.state!;
    const visibleToA = getVisibleGameState(raw, "A");

    expect(visibleToA.players.A.hand).toEqual(raw.players.A.hand);
    expect(visibleToA.players.B.hand).toEqual(hiddenTiles(raw.players.B.hand.length));
    expect(visibleToA.boneyard).toEqual(hiddenTiles(raw.boneyard.length));
    expect(visibleToA.deadTiles).toEqual(hiddenTiles(raw.deadTiles.length));
  });

  it("rejects game starts requested by sockets that are not room players", () => {
    const room = createRoom("A");
    joinRoom(room.code, "B");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = createRoom("A");
    joinRoom(room.code, "B");
    startGame(room.code, "A");

    room.state = {
      ...room.state!,
      handOver: true,
      players: {
        ...room.state!.players,
        A: { ...room.state!.players.A, score: 42 },
      },
    };

    expect(() => startGame(room.code, "A")).toThrow(/already in progress/i);
    expect(room.state!.players.A.score).toBe(42);
  });

  it("rejects next-hand requests from sockets that are not room players", () => {
    const room = createRoom("A");
    joinRoom(room.code, "B");
    startGame(room.code, "A");
    room.state = { ...room.state!, handOver: true };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state!.handNumber).toBe(1);
  });

  it("rejects malicious room config before allocating an oversized tile set", () => {
    const room = createRoom("A", { maxPips: 50 });
    joinRoom(room.code, "B");

    expect(() => startGame(room.code, "A")).toThrow(/Invalid maxPips/i);
  });
});
