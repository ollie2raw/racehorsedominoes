import { describe, expect, it } from "vitest";

import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import { Tile } from "./game/types";

const HIDDEN_TILE: Tile = { high: -1, low: -1 };

describe("room lifecycle security", () => {
  it("rejects game starts from sockets that are not seated in the room", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow("Not a player in this room.");
    expect(room.state).toBeNull();
  });

  it("rejects next-hand requests from sockets that are not seated in the room", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow("Not a player in this room.");
    expect(room.state.handOver).toBe(true);
  });

  it("rejects game:start between hands so accumulated scores cannot be reset", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    room.state = {
      ...room.state!,
      players: {
        ...room.state!.players,
        "player-a": {
          ...room.state!.players["player-a"],
          score: 35,
        },
      },
      handOver: true,
      gameOver: false,
    };

    expect(() => startGame(room.code, "player-a")).toThrow("Game is already in progress.");
    expect(room.state.players["player-a"].score).toBe(35);
  });

  it("masks opponent hands, boneyard, and dead tiles in visible game state", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    const rawState = room.state!;
    const visibleToA = getVisibleGameState(rawState, "player-a");

    expect(visibleToA.players["player-a"].hand).toEqual(rawState.players["player-a"].hand);
    expect(visibleToA.players["player-b"].hand).toHaveLength(rawState.players["player-b"].hand.length);
    expect(visibleToA.players["player-b"].hand.every((tile) => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visibleToA.players["player-b"].hand).not.toEqual(rawState.players["player-b"].hand);

    expect(visibleToA.boneyard).toHaveLength(rawState.boneyard.length);
    expect(visibleToA.boneyard.every((tile) => tile.high === -1 && tile.low === -1)).toBe(true);

    expect(visibleToA.deadTiles).toHaveLength(rawState.deadTiles.length);
    expect(visibleToA.deadTiles.every((tile) => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(HIDDEN_TILE).toEqual({ high: -1, low: -1 });
  });
});
