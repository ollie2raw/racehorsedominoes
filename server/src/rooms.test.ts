import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function createStartedRoom() {
  const room = createRoom("player-a");
  joinRoom(room.code, "player-b");
  startGame(room.code, "player-a");
  if (!room.state) {
    throw new Error("Expected started room to have state.");
  }
  return room;
}

describe("room lifecycle authorization", () => {
  it("rejects game start from a socket that is not seated in the room", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next hand from a socket that is not seated in the room", () => {
    const room = createStartedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handOver).toBe(true);
  });

  it("rejects game start between hands so accumulated scores are not wiped", () => {
    const room = createStartedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        "player-a": {
          ...room.state!.players["player-a"],
          score: 25,
        },
      },
    };

    expect(() => startGame(room.code, "player-a")).toThrow(
      /already started|next hand/i
    );
    expect(room.state.players["player-a"].score).toBe(25);
  });

  it("rejects gameplay actions from sockets that are not seated in the room", () => {
    const room = createStartedRoom();

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow(
      /not a player/i
    );
  });
});

describe("visible room state", () => {
  it("only reveals the recipient player's hand and masks hidden tiles", () => {
    const room = createStartedRoom();
    const rawState = room.state!;

    const visibleForA = getVisibleGameState(rawState, "player-a");

    expect(visibleForA.players["player-a"].hand).toEqual(
      rawState.players["player-a"].hand
    );
    expect(visibleForA.players["player-b"].hand).toHaveLength(
      rawState.players["player-b"].hand.length
    );
    expect(
      visibleForA.players["player-b"].hand.every(
        tile => tile.high === -1 && tile.low === -1
      )
    ).toBe(true);
    expect(visibleForA.boneyard).toHaveLength(rawState.boneyard.length);
    expect(
      visibleForA.boneyard.every(tile => tile.high === -1 && tile.low === -1)
    ).toBe(true);
    expect(visibleForA.deadTiles).toHaveLength(rawState.deadTiles.length);
    expect(
      visibleForA.deadTiles.every(tile => tile.high === -1 && tile.low === -1)
    ).toBe(true);
  });
});
