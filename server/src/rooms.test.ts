import { describe, expect, it } from "vitest";

import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  act,
  getVisibleGameState,
} from "./rooms";
import { createInitialState } from "./game/engine";
import { GameState, Tile } from "./game/types";

function t(low: number, high: number): Tile {
  return { low, high };
}

function createTwoPlayerRoom() {
  const room = createRoom("player-a");
  joinRoom(room.code, "player-b");
  return room;
}

function stateBetweenHands(): GameState {
  const state = createInitialState(["player-a", "player-b"]);
  return {
    ...state,
    handNumber: 1,
    handOver: true,
    gameOver: false,
    players: {
      "player-a": { id: "player-a", hand: [], score: 25 },
      "player-b": { id: "player-b", hand: [t(1, 2)], score: 10 },
    },
  };
}

describe("room authorization", () => {
  it("rejects game start requests from sockets that are not seated players", () => {
    const room = createTwoPlayerRoom();

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next hand requests from sockets that are not seated players", () => {
    const room = createTwoPlayerRoom();
    room.state = stateBetweenHands();

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(1);
  });

  it("rejects game actions from sockets that are not seated players", () => {
    const room = createTwoPlayerRoom();
    room.state = {
      ...stateBetweenHands(),
      handOver: false,
      boneyard: [t(5, 6)],
    };

    expect(() => act(room.code, "intruder", { type: "DRAW" })).toThrow(/not a player/i);
  });

  it("does not let game:start reset scores between hands", () => {
    const room = createTwoPlayerRoom();
    room.state = stateBetweenHands();

    expect(() => startGame(room.code, "player-a")).toThrow(/already started/i);
    expect(room.state.players["player-a"].score).toBe(25);
    expect(room.state.handNumber).toBe(1);
  });
});

describe("visible room state", () => {
  it("keeps opponent hands, boneyard, and dead tiles hidden from each player", () => {
    const room = createTwoPlayerRoom();
    room.state = {
      ...createInitialState(["player-a", "player-b"]),
      players: {
        "player-a": { id: "player-a", hand: [t(0, 1)], score: 0 },
        "player-b": { id: "player-b", hand: [t(2, 3), t(4, 5)], score: 0 },
      },
      boneyard: [t(6, 6), t(0, 0)],
      deadTiles: [t(1, 1)],
    };

    const visible = getVisibleGameState(room, "player-a");

    expect(visible.players["player-a"].hand).toEqual([t(0, 1)]);
    expect(visible.players["player-b"].hand).toEqual([
      { low: -1, high: -1 },
      { low: -1, high: -1 },
    ]);
    expect(visible.boneyard).toEqual([
      { low: -1, high: -1 },
      { low: -1, high: -1 },
    ]);
    expect(visible.deadTiles).toEqual([{ low: -1, high: -1 }]);
  });
});
