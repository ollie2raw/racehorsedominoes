import { describe, expect, it } from "vitest";
import * as Rooms from "./rooms";
import { GameState, Tile } from "./game/types";

function hiddenTiles(count: number): Tile[] {
  return Array.from({ length: count }, () => ({ high: -1, low: -1 }));
}

describe("room security and lifecycle", () => {
  it("masks hidden game state for non-owning players", () => {
    const room = Rooms.createRoom("A");
    Rooms.joinRoom(room.code, "B");
    Rooms.startGame(room.code, "A");

    const state = room.state as GameState;
    const getVisibleGameState = (Rooms as unknown as {
      getVisibleGameState?: (state: GameState, viewerId: string) => GameState;
    }).getVisibleGameState;

    expect(typeof getVisibleGameState).toBe("function");

    const visible = getVisibleGameState!(state, "A");

    expect(visible.players.A.hand).toEqual(state.players.A.hand);
    expect(visible.players.B.hand).toEqual(hiddenTiles(state.players.B.hand.length));
    expect(visible.boneyard).toEqual(hiddenTiles(state.boneyard.length));
    expect(visible.deadTiles).toEqual(hiddenTiles(state.deadTiles.length));
    expect(visible.players.A.score).toBe(state.players.A.score);
    expect(visible.players.B.score).toBe(state.players.B.score);
    expect(visible.board).toBe(state.board);
  });

  it("rejects game start attempts from sockets outside the room", () => {
    const room = Rooms.createRoom("A");
    Rooms.joinRoom(room.code, "B");

    expect(() => Rooms.startGame(room.code, "intruder")).toThrow(
      "Socket is not a player in this room."
    );
    expect(room.state).toBeNull();
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = Rooms.createRoom("A");
    Rooms.joinRoom(room.code, "B");
    Rooms.startGame(room.code, "A");

    room.state = {
      ...(room.state as GameState),
      handOver: true,
      gameOver: false,
      players: {
        A: { ...(room.state as GameState).players.A, score: 15 },
        B: { ...(room.state as GameState).players.B, score: 10 },
      },
    };

    expect(() => Rooms.startGame(room.code, "A")).toThrow(
      "Game is already in progress."
    );
    expect(room.state.players.A.score).toBe(15);
    expect(room.state.players.B.score).toBe(10);
  });

  it("rejects next-hand attempts from sockets outside the room", () => {
    const room = Rooms.createRoom("A");
    Rooms.joinRoom(room.code, "B");
    Rooms.startGame(room.code, "A");
    room.state = {
      ...(room.state as GameState),
      handOver: true,
      gameOver: false,
    };

    expect(() => Rooms.nextHand(room.code, "intruder")).toThrow(
      "Socket is not a player in this room."
    );
    expect(room.state?.handNumber).toBe(1);
  });

  it("rejects game actions from sockets outside the room", () => {
    const room = Rooms.createRoom("A");
    Rooms.joinRoom(room.code, "B");
    Rooms.startGame(room.code, "A");
    const stateBefore = room.state;

    expect(() => Rooms.act(room.code, "intruder", { type: "DRAW" })).toThrow(
      "Socket is not a player in this room."
    );
    expect(room.state).toBe(stateBefore);
  });
});
