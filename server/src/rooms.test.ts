import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getRoom,
  getVisibleGameState,
} from "./rooms";

function expectHiddenTiles(tiles: readonly { high: number; low: number }[], count: number) {
  expect(tiles).toHaveLength(count);
  expect(tiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
}

describe("room state visibility", () => {
  it("masks opponent hands, boneyard, and dead tiles for each player", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    const actual = getRoom(room.code).state;
    expect(actual).not.toBeNull();

    const visibleToA = getVisibleGameState(room.code, "player-a");
    const visibleToB = getVisibleGameState(room.code, "player-b");

    expect(visibleToA.players["player-a"].hand).toEqual(actual!.players["player-a"].hand);
    expectHiddenTiles(visibleToA.players["player-b"].hand, actual!.players["player-b"].hand.length);
    expectHiddenTiles(visibleToA.boneyard, actual!.boneyard.length);
    expectHiddenTiles(visibleToA.deadTiles, actual!.deadTiles.length);

    expect(visibleToB.players["player-b"].hand).toEqual(actual!.players["player-b"].hand);
    expectHiddenTiles(visibleToB.players["player-a"].hand, actual!.players["player-a"].hand.length);
  });
});

describe("room action authorization", () => {
  it("rejects game start attempts from sockets that are not room players", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("does not allow startGame to reset scores between hands", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    const activeRoom = getRoom(room.code);
    activeRoom.state = {
      ...activeRoom.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...activeRoom.state!.players,
        "player-a": { ...activeRoom.state!.players["player-a"], score: 25 },
      },
    };

    expect(() => startGame(room.code, "player-a")).toThrow(/already started/i);
    expect(getRoom(room.code).state!.players["player-a"].score).toBe(25);
  });

  it("rejects next-hand attempts from sockets that are not room players", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    const activeRoom = getRoom(room.code);
    activeRoom.state = {
      ...activeRoom.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
  });
});
