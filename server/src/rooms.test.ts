import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import {
  createInitialState,
  startNewHand,
} from "./game/engine";
import type { GameState, Tile } from "./game/types";

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function createTwoPlayerRoom() {
  const room = createRoom("player-a");
  joinRoom(room.code, "player-b");
  return room;
}

function createVisibleStateFixture(): GameState {
  const base = createInitialState(["player-a", "player-b"]);
  return {
    ...base,
    players: {
      "player-a": { id: "player-a", hand: [t(1, 2), t(3, 4)], score: 10 },
      "player-b": { id: "player-b", hand: [t(5, 6), t(0, 0), t(2, 2)], score: 20 },
    },
    boneyard: [t(1, 1), t(4, 6)],
    deadTiles: [t(3, 3)],
  };
}

describe("room state visibility", () => {
  it("only exposes a viewer's own hidden tile identities", () => {
    const state = createVisibleStateFixture();

    const visible = getVisibleGameState(state, "player-a");

    expect(visible.players["player-a"].hand).toEqual(state.players["player-a"].hand);
    expect(visible.players["player-b"].hand).toEqual([
      { high: -1, low: -1 },
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
  it("rejects game start from a socket that is not seated in the room", () => {
    const room = createTwoPlayerRoom();

    expect(() => startGame(room.code, "spectator")).toThrow("not a player");
  });

  it("rejects next hand from a socket that is not seated in the room", () => {
    const room = createTwoPlayerRoom();
    let state = createInitialState(room.players);
    state = startNewHand(state);
    room.state = {
      ...state,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "spectator")).toThrow("not a player");
  });

  it("rejects actions from a socket that is not seated in the room", () => {
    const room = createTwoPlayerRoom();
    startGame(room.code, "player-a");

    expect(() => act(room.code, "spectator", { type: "PASS" })).toThrow("not a player");
  });
});

describe("room lifecycle", () => {
  it("does not allow game:start to wipe scores between hands", () => {
    const room = createTwoPlayerRoom();
    let state = createInitialState(room.players);
    state = startNewHand(state);
    room.state = {
      ...state,
      players: {
        ...state.players,
        "player-a": { ...state.players["player-a"], score: 25 },
      },
      handOver: true,
      gameOver: false,
      winnerId: null,
    };

    expect(() => startGame(room.code, "player-a")).toThrow("already started");
    expect(room.state?.players["player-a"].score).toBe(25);
  });
});
