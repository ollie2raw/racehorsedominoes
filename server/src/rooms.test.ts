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

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function endedHandState(players: string[]): GameState {
  const state = createInitialState(players, {
    tilesPerPlayer: 1,
    deadTileCount: 0,
    winningScore: 60,
  });

  return {
    ...state,
    players: {
      [players[0]]: { id: players[0], hand: [t(1, 2)], score: 15 },
      [players[1]]: { id: players[1], hand: [t(3, 4)], score: 10 },
    },
    boneyard: [t(5, 6)],
    deadTiles: [t(0, 0)],
    handNumber: 1,
    handOpen: true,
    handOver: true,
    gameOver: false,
  };
}

describe("room lifecycle security", () => {
  it("rejects game starts from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "attacker")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next hand requests from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = endedHandState(room.players);

    expect(() => nextHand(room.code, "attacker")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(1);
    expect(room.state.players.host.score).toBe(15);
  });

  it("does not let game:start wipe scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = endedHandState(room.players);

    expect(() => startGame(room.code, "host")).toThrow(/next hand/i);
    expect(room.state.handNumber).toBe(1);
    expect(room.state.players.host.score).toBe(15);
    expect(room.state.players.guest.score).toBe(10);
  });

  it("preserves accumulated scores when a room player starts the next hand", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = endedHandState(room.players);

    const updated = nextHand(room.code, "guest");

    expect(updated.state?.handNumber).toBe(2);
    expect(updated.state?.players.host.score).toBe(15);
    expect(updated.state?.players.guest.score).toBe(10);
  });
});

describe("visible room state", () => {
  it("hides opponent hands, boneyard tiles, and dead tiles from each player", () => {
    const state = endedHandState(["host", "guest"]);

    const visible = getVisibleGameState(state, "host");

    expect(visible.players.host.hand).toEqual([t(1, 2)]);
    expect(visible.players.guest.hand).toEqual([{ high: -1, low: -1 }]);
    expect(visible.boneyard).toEqual([{ high: -1, low: -1 }]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
  });
});
