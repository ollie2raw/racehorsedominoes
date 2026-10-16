import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  nextHand,
  startGame,
  act,
  getRoomJoinResponse,
  getRoomStateUpdate,
  getVisibleGameState,
} from "./rooms";
import { createInitialState } from "./game/engine";
import { GameState, Tile } from "./game/types";

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function makeStartedRoom() {
  const room = createRoom(`host-${Math.random()}`);
  joinRoom(room.code, `guest-${Math.random()}`);
  return room;
}

describe("room lifecycle security", () => {
  it("rejects game start from sockets that are not seated in the room", () => {
    const room = makeStartedRoom();

    expect(() => startGame(room.code, "intruder")).toThrow(/not.*player/i);
  });

  it("rejects next-hand requests from sockets that are not seated in the room", () => {
    const room = makeStartedRoom();
    startGame(room.code, room.players[0]);
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not.*player/i);
  });

  it("rejects game actions from sockets that are not seated in the room", () => {
    const room = makeStartedRoom();
    startGame(room.code, room.players[0]);
    const before = room.state;

    expect(() => act(room.code, "intruder", { type: "DRAW" })).toThrow(/not.*player/i);
    expect(room.state).toBe(before);
  });

  it("does not allow game:start to wipe scores between hands", () => {
    const room = makeStartedRoom();
    const state = createInitialState(room.players);
    room.state = {
      ...state,
      handNumber: 1,
      handOver: true,
      gameOver: false,
      players: {
        [room.players[0]]: { ...state.players[room.players[0]], score: 25 },
        [room.players[1]]: { ...state.players[room.players[1]], score: 10 },
      },
    };

    expect(() => startGame(room.code, room.players[0])).toThrow(/next hand|already/i);
    expect(room.state.players[room.players[0]].score).toBe(25);
    expect(room.state.players[room.players[1]].score).toBe(10);
  });
});

describe("visible room state", () => {
  it("masks opponent hands, boneyard, and dead tile identities", () => {
    const state = createInitialState(["A", "B"]) as GameState;
    const visible = getVisibleGameState(
      {
        ...state,
        players: {
          A: { id: "A", hand: [t(1, 2)], score: 0 },
          B: { id: "B", hand: [t(3, 4), t(5, 6)], score: 0 },
        },
        boneyard: [t(0, 0), t(2, 2)],
        deadTiles: [t(6, 6)],
      },
      "A"
    );

    expect(visible.players.A.hand).toEqual([t(1, 2)]);
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

  it("builds state-update payloads with masked private state", () => {
    const room = makeStartedRoom();
    const state = createInitialState(room.players) as GameState;
    room.state = {
      ...state,
      players: {
        [room.players[0]]: { id: room.players[0], hand: [t(1, 2)], score: 0 },
        [room.players[1]]: { id: room.players[1], hand: [t(3, 4)], score: 0 },
      },
      boneyard: [t(0, 0)],
      deadTiles: [t(6, 6)],
    };

    const update = getRoomStateUpdate(room.code, room.players[0]);

    expect(update.state.players[room.players[0]].hand).toEqual([t(1, 2)]);
    expect(update.state.players[room.players[1]].hand).toEqual([{ high: -1, low: -1 }]);
    expect(update.state.boneyard).toEqual([{ high: -1, low: -1 }]);
    expect(update.state.deadTiles).toEqual([{ high: -1, low: -1 }]);
  });

  it("builds join responses with masked private state", () => {
    const room = makeStartedRoom();
    const state = createInitialState(room.players) as GameState;
    room.state = {
      ...state,
      players: {
        [room.players[0]]: { id: room.players[0], hand: [t(1, 2)], score: 0 },
        [room.players[1]]: { id: room.players[1], hand: [t(3, 4)], score: 0 },
      },
      boneyard: [t(0, 0)],
      deadTiles: [t(6, 6)],
    };

    const response = getRoomJoinResponse(room, room.players[1]);

    expect(response).toMatchObject({
      ok: true,
      roomCode: room.code,
      you: room.players[1],
      players: room.players,
    });
    expect(response.state?.players[room.players[0]].hand).toEqual([{ high: -1, low: -1 }]);
    expect(response.state?.players[room.players[1]].hand).toEqual([t(3, 4)]);
    expect(response.state?.boneyard).toEqual([{ high: -1, low: -1 }]);
    expect(response.state?.deadTiles).toEqual([{ high: -1, low: -1 }]);
  });
});
