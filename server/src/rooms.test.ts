import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getVisibleGameState,
} from "./rooms";
import { createInitialState } from "./game/engine";
import { GameState, Tile } from "./game/types";

function tile(low: number, high: number): Tile {
  return { low, high };
}

function handOverState(playerIds: string[]): GameState {
  const state = createInitialState(playerIds);
  return {
    ...state,
    handNumber: 1,
    handOver: true,
    players: {
      [playerIds[0]]: { id: playerIds[0], hand: [tile(1, 2)], score: 25 },
      [playerIds[1]]: { id: playerIds[1], hand: [tile(3, 4)], score: 15 },
    },
  };
}

describe("room visibility", () => {
  it("only exposes hidden tile identities to the owning player", () => {
    const state = createInitialState(["A", "B"]);
    const fullState: GameState = {
      ...state,
      players: {
        A: { id: "A", hand: [tile(1, 2)], score: 10 },
        B: { id: "B", hand: [tile(3, 4), tile(5, 6)], score: 20 },
      },
      boneyard: [tile(0, 0), tile(0, 1)],
      deadTiles: [tile(2, 2)],
    };

    const visible = getVisibleGameState(fullState, "A");

    expect(visible.players.A.hand).toEqual(fullState.players.A.hand);
    expect(visible.players.B.hand).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.boneyard).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
  });
});

describe("room authorization", () => {
  it("rejects game start attempts from sockets outside the room", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder" as never)).toThrow(/player/i);
    expect(room.state).toBeNull();
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = handOverState(room.players);

    expect(() => startGame(room.code, "host" as never)).toThrow(/already|next hand/i);
    expect(room.state.players.host.score).toBe(25);
    expect(room.state.players.guest.score).toBe(15);
  });

  it("rejects next-hand attempts from sockets outside the room", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = handOverState(room.players);

    expect(() => nextHand(room.code, "intruder" as never)).toThrow(/player/i);
    expect(room.state?.handNumber).toBe(1);
  });
});
