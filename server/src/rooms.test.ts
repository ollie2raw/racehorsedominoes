import { describe, expect, it } from "vitest";
import * as rooms from "./rooms";
import { createInitialState, startNewHand } from "./game/engine";
import { GameState, Tile } from "./game/types";

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function createTwoPlayerRoom() {
  const room = rooms.createRoom(`host-${Math.random()}`);
  const guestId = `guest-${Math.random()}`;
  rooms.joinRoom(room.code, guestId);
  return { room, hostId: room.players[0], guestId };
}

describe("room lifecycle authorization", () => {
  it("rejects game starts from sockets that are not seated in the room", () => {
    const { room } = createTwoPlayerRoom();

    expect(() => rooms.startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(rooms.getRoom(room.code).state).toBeNull();
  });

  it("rejects next hand requests from sockets that are not seated in the room", () => {
    const { room } = createTwoPlayerRoom();
    room.state = {
      ...createInitialState(room.players),
      handNumber: 1,
      handOver: true,
    };

    expect(() => rooms.nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(rooms.getRoom(room.code).state?.handNumber).toBe(1);
  });

  it("does not let game:start wipe scores between hands", () => {
    const { room, hostId, guestId } = createTwoPlayerRoom();
    room.state = {
      ...createInitialState(room.players),
      handNumber: 3,
      handOver: true,
      players: {
        [hostId]: { id: hostId, hand: [], score: 25 },
        [guestId]: { id: guestId, hand: [], score: 10 },
      },
    };

    expect(() => rooms.startGame(room.code, hostId)).toThrow(/already/i);
    expect(rooms.getRoom(room.code).state?.players[hostId].score).toBe(25);
  });
});

describe("visible room state", () => {
  it("masks hidden tiles while preserving public counts and the viewer hand", () => {
    const getVisibleGameState = (rooms as any).getVisibleGameState;
    expect(typeof getVisibleGameState).toBe("function");

    const state: GameState = {
      ...createInitialState(["A", "B"]),
      players: {
        A: { id: "A", hand: [t(1, 2), t(3, 4)], score: 0 },
        B: { id: "B", hand: [t(5, 6)], score: 7 },
      },
      boneyard: [t(0, 0), t(1, 1)],
      deadTiles: [t(2, 2)],
    };

    const visible = getVisibleGameState(state, "A");

    expect(visible.players.A.hand).toEqual([t(1, 2), t(3, 4)]);
    expect(visible.players.B.hand).toEqual([{ high: -1, low: -1 }]);
    expect(visible.players.B.score).toBe(7);
    expect(visible.boneyard).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
  });

  it("returns a masked room state for the requesting player", () => {
    const { room, hostId, guestId } = createTwoPlayerRoom();
    room.state = startNewHand(createInitialState(room.players));

    const visible = (rooms as any).getRoomStateForPlayer(room.code, hostId);

    expect(visible.players[hostId].hand).toHaveLength(room.state.players[hostId].hand.length);
    expect(visible.players[guestId].hand).toEqual(
      room.state.players[guestId].hand.map(() => ({ high: -1, low: -1 }))
    );
  });
});
