import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getVisibleGameState,
} from "./rooms";

describe("room lifecycle security", () => {
  it("rejects game start requests from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next-hand requests from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(1);
    expect(room.state.handOver).toBe(true);
  });

  it("does not allow game:start to wipe scores after a completed hand", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        host: { ...room.state!.players.host, score: 42 },
        guest: { ...room.state!.players.guest, score: 7 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow(/already started/i);
    expect(room.state.players.host.score).toBe(42);
    expect(room.state.players.guest.score).toBe(7);
  });
});

describe("visible room state", () => {
  it("masks opponent hands, boneyard, and dead tiles for each viewer", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const raw = room.state!;
    const visible = getVisibleGameState(raw, "host");

    expect(visible.players.host.hand).toEqual(raw.players.host.hand);
    expect(visible.players.guest.hand).toHaveLength(raw.players.guest.hand.length);
    expect(visible.players.guest.hand.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.boneyard).toHaveLength(raw.boneyard.length);
    expect(visible.boneyard.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.deadTiles).toHaveLength(raw.deadTiles.length);
    expect(visible.deadTiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
  });
}
);
