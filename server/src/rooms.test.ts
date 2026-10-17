import { describe, expect, it } from "vitest";
import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import { GameState } from "./game/types";

function startedRoom() {
  const room = createRoom("A");
  joinRoom(room.code, "B");
  startGame(room.code, "A");
  if (!room.state) throw new Error("Expected started room to have state");
  return room;
}

describe("room security boundaries", () => {
  it("visible game state hides opponent hands and hidden piles while preserving counts", () => {
    const room = startedRoom();
    const state = room.state as GameState;
    const visibleToA = getVisibleGameState(state, "A");

    expect(visibleToA.players.A.hand).toEqual(state.players.A.hand);
    expect(visibleToA.players.B.hand).toHaveLength(state.players.B.hand.length);
    expect(visibleToA.players.B.hand.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);

    expect(visibleToA.boneyard).toHaveLength(state.boneyard.length);
    expect(visibleToA.boneyard.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visibleToA.deadTiles).toHaveLength(state.deadTiles.length);
    expect(visibleToA.deadTiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
  });

  it("rejects game starts from sockets that are not seated in the room", () => {
    const room = createRoom("A");
    joinRoom(room.code, "B");

    expect(() => startGame(room.code, "intruder")).toThrow("not a player");
    expect(room.state).toBeNull();
  });

  it("does not allow startGame to wipe scores between hands", () => {
    const room = startedRoom();
    const state = room.state as GameState;
    room.state = {
      ...state,
      handOver: true,
      players: {
        ...state.players,
        A: { ...state.players.A, score: 25 },
      },
    };

    expect(() => startGame(room.code, "A")).toThrow("already started");
    expect(room.state.players.A.score).toBe(25);
  });

  it("rejects next-hand requests from sockets that are not seated in the room", () => {
    const room = startedRoom();
    const state = room.state as GameState;
    room.state = { ...state, handOver: true };
    const previousHandNumber = state.handNumber;

    expect(() => nextHand(room.code, "intruder")).toThrow("not a player");
    expect(room.state.handNumber).toBe(previousHandNumber);
  });
});
