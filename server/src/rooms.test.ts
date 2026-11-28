import { describe, expect, it } from "vitest";
import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function expectHiddenTiles(tiles: readonly { high: number; low: number }[], count: number) {
  expect(tiles).toHaveLength(count);
  expect(tiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
}

describe("room state visibility and authorization", () => {
  it("only exposes a player's own hand while preserving hidden tile counts", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    startGame(room.code, "player-a");

    expect(room.state).not.toBeNull();
    const fullState = room.state!;
    const visibleToA = getVisibleGameState(fullState, "player-a");

    expect(visibleToA.players["player-a"].hand).toEqual(fullState.players["player-a"].hand);
    expectHiddenTiles(
      visibleToA.players["player-b"].hand,
      fullState.players["player-b"].hand.length
    );
    expectHiddenTiles(visibleToA.boneyard, fullState.boneyard.length);
    expectHiddenTiles(visibleToA.deadTiles, fullState.deadTiles.length);
    expect(visibleToA.players["player-a"].score).toBe(fullState.players["player-a"].score);
    expect(visibleToA.players["player-b"].score).toBe(fullState.players["player-b"].score);
  });

  it("rejects game lifecycle calls from sockets that are not room players", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);

    startGame(room.code, "player-a");
    room.state = { ...room.state!, handOver: true };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("does not allow startGame to wipe scores between hands", () => {
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

    expect(() => startGame(room.code, "player-a")).toThrow(/already in progress/i);
    expect(room.state.players["player-a"].score).toBe(25);
  });

  it("rejects malicious config before generating oversized tile sets or invalid scoring math", () => {
    const hugeSetRoom = createRoom("player-a", { maxPips: 50 });
    joinRoom(hugeSetRoom.code, "player-b");
    expect(() => startGame(hugeSetRoom.code, "player-a")).toThrow(/maxPips/i);

    const invalidScoringRoom = createRoom("player-c", { scoringMultiple: 0 });
    joinRoom(invalidScoringRoom.code, "player-d");
    expect(() => startGame(invalidScoringRoom.code, "player-c")).toThrow(/scoringMultiple/i);
  });
});
