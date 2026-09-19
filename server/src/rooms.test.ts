import { describe, expect, it } from "vitest";

import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import { createInitialState } from "./game/engine";

function expectHiddenTiles(tiles: readonly { high: number; low: number }[]) {
  expect(tiles.length).toBeGreaterThan(0);
  expect(tiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
}

describe("room-visible game state", () => {
  it("shows only the viewer's hand and masks hidden tile identities", () => {
    const playerA = "socket-A";
    const playerB = "socket-B";
    const room = createRoom(playerA, {
      tilesPerPlayer: 2,
      deadTileCount: 2,
    });
    joinRoom(room.code, playerB);
    startGame(room.code, playerA);

    expect(room.state).not.toBeNull();
    const rawState = room.state!;
    const visibleToA = getVisibleGameState(rawState, playerA);
    const visibleToB = getVisibleGameState(rawState, playerB);

    expect(visibleToA.players[playerA].hand).toEqual(rawState.players[playerA].hand);
    expect(visibleToB.players[playerB].hand).toEqual(rawState.players[playerB].hand);

    expect(visibleToA.players[playerB].hand).toHaveLength(rawState.players[playerB].hand.length);
    expect(visibleToB.players[playerA].hand).toHaveLength(rawState.players[playerA].hand.length);
    expectHiddenTiles(visibleToA.players[playerB].hand);
    expectHiddenTiles(visibleToB.players[playerA].hand);

    expect(visibleToA.boneyard).toHaveLength(rawState.boneyard.length);
    expect(visibleToA.deadTiles).toHaveLength(rawState.deadTiles.length);
    expectHiddenTiles(visibleToA.boneyard);
    expectHiddenTiles(visibleToA.deadTiles);

    expect(rawState.players[playerB].hand.some(tile => tile.high !== -1 || tile.low !== -1)).toBe(true);
  });
});

describe("room lifecycle guards", () => {
  it("rejects game start from sockets outside the room", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("does not allow game:start to reset scores between hands", () => {
    const playerA = "score-A";
    const playerB = "score-B";
    const room = createRoom(playerA);
    joinRoom(room.code, playerB);
    const state = createInitialState([playerA, playerB]);
    room.state = {
      ...state,
      handNumber: 1,
      handOver: true,
      players: {
        [playerA]: { id: playerA, hand: [], score: 25 },
        [playerB]: { id: playerB, hand: [], score: 15 },
      },
    };

    expect(() => startGame(room.code, playerA)).toThrow(/already started/i);
    expect(room.state.players[playerA].score).toBe(25);
    expect(room.state.players[playerB].score).toBe(15);
  });

  it("rejects next hand from sockets outside the room", () => {
    const playerA = "next-A";
    const playerB = "next-B";
    const room = createRoom(playerA);
    joinRoom(room.code, playerB);
    room.state = {
      ...createInitialState([playerA, playerB]),
      handNumber: 1,
      handOver: true,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
  });
});
