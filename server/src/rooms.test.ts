import { describe, expect, it } from "vitest";
import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

describe("room state visibility", () => {
  it("hides opponent hand, boneyard, and dead tile identities while preserving counts", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    const rawState = room.state;
    const visibleToA = getVisibleGameState(room.code, "player-a");
    expect(rawState).not.toBeNull();
    expect(visibleToA).not.toBeNull();
    if (!rawState || !visibleToA) return;

    expect(visibleToA.players["player-a"].hand).toEqual(rawState.players["player-a"].hand);
    expect(visibleToA.players["player-b"].hand).toHaveLength(rawState.players["player-b"].hand.length);
    expect(visibleToA.players["player-b"].hand.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);

    expect(visibleToA.boneyard).toHaveLength(rawState.boneyard.length);
    expect(visibleToA.boneyard.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visibleToA.deadTiles).toHaveLength(rawState.deadTiles.length);
    expect(visibleToA.deadTiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
  });
});

describe("room lifecycle authorization", () => {
  it("rejects start and next-hand requests from sockets that are not room players", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/);

    startGame(room.code, "player-a");
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/);
  });

  it("does not allow game:start to wipe scores between hands", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        "player-a": { ...room.state!.players["player-a"], score: 25 },
      },
    };

    expect(() => startGame(room.code, "player-a")).toThrow(/already in progress/);
    expect(room.state.players["player-a"].score).toBe(25);
  });
});
