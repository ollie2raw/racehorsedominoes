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

function t(low: number, high: number): Tile {
  return { low, high };
}

function createTwoPlayerRoom() {
  const room = createRoom(`host-${crypto.randomUUID()}`);
  const guestId = `guest-${crypto.randomUUID()}`;
  joinRoom(room.code, guestId);
  return { room, hostId: room.players[0], guestId };
}

function stateWithHands(hostId: string, guestId: string): GameState {
  const state = createInitialState([hostId, guestId]);
  return {
    ...state,
    players: {
      [hostId]: { id: hostId, hand: [t(1, 2), t(3, 4)], score: 0 },
      [guestId]: { id: guestId, hand: [t(5, 6)], score: 0 },
    },
    boneyard: [t(0, 0), t(0, 1), t(0, 2)],
    deadTiles: [t(6, 6)],
  };
}

describe("room lifecycle security", () => {
  it("rejects game start from a socket that is not seated in the room", () => {
    const { room } = createTwoPlayerRoom();

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next hand from a socket that is not seated in the room", () => {
    const { room, hostId } = createTwoPlayerRoom();
    room.state = stateWithHands(room.players[0], room.players[1]);
    room.state = { ...room.state, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(() => nextHand(room.code, hostId)).not.toThrow();
  });

  it("does not allow game:start to reset scores between hands", () => {
    const { room, hostId, guestId } = createTwoPlayerRoom();
    room.state = {
      ...stateWithHands(hostId, guestId),
      handNumber: 3,
      handOver: true,
      gameOver: false,
      players: {
        [hostId]: { id: hostId, hand: [], score: 55 },
        [guestId]: { id: guestId, hand: [t(6, 6)], score: 10 },
      },
    };

    expect(() => startGame(room.code, hostId)).toThrow(/next hand/i);
    expect(room.state.players[hostId].score).toBe(55);
    expect(room.state.handNumber).toBe(3);
  });
});

describe("visible room state", () => {
  it("hides opponent hands, boneyard, and dead tiles from a player view", () => {
    const hostId = "host";
    const guestId = "guest";
    const state = stateWithHands(hostId, guestId);

    const visible = getVisibleGameState(state, hostId);

    expect(visible.players[hostId].hand).toEqual([t(1, 2), t(3, 4)]);
    expect(visible.players[guestId].hand).toEqual([{ high: -1, low: -1 }]);
    expect(visible.boneyard).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
    expect(state.players[guestId].hand).toEqual([t(5, 6)]);
  });
});
