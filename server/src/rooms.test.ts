import { describe, expect, it } from "vitest";

import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import { createInitialState } from "./game/engine";
import { GameState, Tile } from "./game/types";

function t(low: number, high: number): Tile {
  return { low, high };
}

function makeHandOverState(playerIds: string[]): GameState {
  const base = createInitialState(playerIds, {
    tilesPerPlayer: 1,
    deadTileCount: 0,
  });

  return {
    ...base,
    players: {
      [playerIds[0]]: {
        id: playerIds[0],
        hand: [t(1, 1)],
        score: 15,
      },
      [playerIds[1]]: {
        id: playerIds[1],
        hand: [t(2, 2)],
        score: 10,
      },
    },
    boneyard: [t(3, 3)],
    handNumber: 3,
    handOver: true,
    gameOver: false,
  };
}

describe("rooms", () => {
  it("rejects game starts from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next hand requests from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = makeHandOverState(room.players);

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(3);
  });

  it("does not let game:start reset scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = makeHandOverState(room.players);

    expect(() => startGame(room.code, "host")).toThrow(/already in progress/i);
    expect(room.state.players.host.score).toBe(15);
    expect(room.state.players.guest.score).toBe(10);
    expect(room.state.handNumber).toBe(3);
  });

  it("hides private tile identities in visible state", () => {
    const state: GameState = {
      ...makeHandOverState(["host", "guest"]),
      players: {
        host: { id: "host", hand: [t(1, 2), t(2, 3)], score: 15 },
        guest: { id: "guest", hand: [t(4, 5)], score: 10 },
      },
      boneyard: [t(0, 0), t(6, 6)],
      deadTiles: [t(3, 4)],
    };

    const visible = getVisibleGameState(state, "host");

    expect(visible.players.host.hand).toEqual([t(1, 2), t(2, 3)]);
    expect(visible.players.guest.hand).toEqual([t(-1, -1)]);
    expect(visible.boneyard).toEqual([t(-1, -1), t(-1, -1)]);
    expect(visible.deadTiles).toEqual([t(-1, -1)]);
  });
});
