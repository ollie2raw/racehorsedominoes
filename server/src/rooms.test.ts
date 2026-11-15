import { describe, expect, it } from "vitest";
import * as rooms from "./rooms";
import type { GameState, Tile } from "./game/types";

const MASKED_TILE: Tile = { high: -1, low: -1 };

function expectMaskedTiles(tiles: readonly Tile[], count: number) {
  expect(tiles).toHaveLength(count);
  expect(tiles.every(tile => tile.high === MASKED_TILE.high && tile.low === MASKED_TILE.low)).toBe(true);
}

function requireState(state: GameState | null): GameState {
  expect(state).not.toBeNull();
  return state as GameState;
}

function createStartedRoom() {
  const room = rooms.createRoom("host");
  rooms.joinRoom(room.code, "guest");
  rooms.startGame(room.code, "host");
  return room;
}

describe("room lifecycle authorization", () => {
  it("rejects game start from a socket that is not seated in the room", () => {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");

    expect(() => rooms.startGame(room.code, "intruder")).toThrow(/not in room/i);
    expect(room.state).toBeNull();
  });

  it("rejects next hand from a socket that is not seated in the room", () => {
    const room = createStartedRoom();
    const state = requireState(room.state);
    room.state = { ...state, handOver: true, gameOver: false };

    expect(() => rooms.nextHand(room.code, "intruder")).toThrow(/not in room/i);
    expect(room.state.handNumber).toBe(state.handNumber);
  });

  it("does not let game:start reset scores between hands", () => {
    const room = createStartedRoom();
    const state = requireState(room.state);
    room.state = {
      ...state,
      handOver: true,
      gameOver: false,
      players: {
        ...state.players,
        host: { ...state.players.host, score: 30 },
        guest: { ...state.players.guest, score: 20 },
      },
    };

    expect(() => rooms.startGame(room.code, "host")).toThrow(/already started|next hand/i);
    expect(room.state.players.host.score).toBe(30);
    expect(room.state.players.guest.score).toBe(20);
  });
});

describe("visible room state", () => {
  it("hides opponent hands, boneyard, and dead tiles from each player view", () => {
    const room = createStartedRoom();
    const state = requireState(room.state);
    const getVisibleGameState = (rooms as any).getVisibleGameState;

    expect(typeof getVisibleGameState).toBe("function");
    if (typeof getVisibleGameState !== "function") return;

    const visible = getVisibleGameState(state, "host") as GameState;

    expect(visible.players.host.hand).toEqual(state.players.host.hand);
    expectMaskedTiles(visible.players.guest.hand, state.players.guest.hand.length);
    expectMaskedTiles(visible.boneyard, state.boneyard.length);
    expectMaskedTiles(visible.deadTiles, state.deadTiles.length);
  });
});
