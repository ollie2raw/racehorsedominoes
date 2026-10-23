import { describe, expect, it } from "vitest";
import * as roomsApi from "./rooms";
import type { Room } from "./rooms";
import type { GameState, Tile } from "./game/types";

const startGameAsSocket = roomsApi.startGame as unknown as (
  code: string,
  socketId: string
) => Room;

const nextHandAsSocket = roomsApi.nextHand as unknown as (
  code: string,
  socketId: string
) => Room;

let socketCounter = 0;

function socketId(prefix: string): string {
  socketCounter += 1;
  return `${prefix}-${socketCounter}`;
}

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function createTwoPlayerRoom(): { room: Room; host: string; guest: string } {
  const host = socketId("host");
  const guest = socketId("guest");
  const room = roomsApi.createRoom(host);
  roomsApi.joinRoom(room.code, guest);
  return { room, host, guest };
}

function createStartedRoom(): { room: Room; host: string; guest: string } {
  const setup = createTwoPlayerRoom();
  startGameAsSocket(setup.room.code, setup.host);
  if (!setup.room.state) throw new Error("test setup failed to start game");
  return setup;
}

describe("room lifecycle authorization", () => {
  it("rejects starting a game from a socket that is not seated in the room", () => {
    const { room } = createTwoPlayerRoom();
    const intruder = socketId("intruder");

    expect(() => startGameAsSocket(room.code, intruder)).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects advancing to the next hand from a socket that is not seated in the room", () => {
    const { room } = createStartedRoom();
    const intruder = socketId("intruder");
    const handNumber = room.state!.handNumber;

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHandAsSocket(room.code, intruder)).toThrow(/not a player/i);
    expect(room.state!.handNumber).toBe(handNumber);
  });

  it("rejects game actions from a socket that is not seated in the room", () => {
    const { room } = createStartedRoom();
    const intruder = socketId("intruder");
    const state = room.state!;

    expect(() => roomsApi.act(room.code, intruder, { type: "PASS" })).toThrow(
      /not a player/i
    );
    expect(room.state).toBe(state);
  });

  it("does not allow game:start to wipe scores between hands", () => {
    const { room, host, guest } = createStartedRoom();
    const state = room.state!;

    room.state = {
      ...state,
      handOver: true,
      gameOver: false,
      players: {
        ...state.players,
        [host]: { ...state.players[host], score: 42 },
        [guest]: { ...state.players[guest], score: 17 },
      },
    };

    expect(() => startGameAsSocket(room.code, host)).toThrow(/already/i);
    expect(room.state!.players[host].score).toBe(42);
    expect(room.state!.players[guest].score).toBe(17);
  });
});

describe("visible room state", () => {
  it("hides opponent hands and all hidden piles from a player's state view", () => {
    const { room, host, guest } = createStartedRoom();
    const state: GameState = {
      ...room.state!,
      players: {
        ...room.state!.players,
        [host]: { ...room.state!.players[host], hand: [t(1, 2), t(3, 4)] },
        [guest]: { ...room.state!.players[guest], hand: [t(5, 6), t(0, 0)] },
      },
      boneyard: [t(1, 1), t(2, 2), t(3, 3)],
      deadTiles: [t(4, 4)],
    };

    const getVisibleGameState = (roomsApi as any).getVisibleGameState as
      | ((state: GameState, viewerId: string) => GameState)
      | undefined;

    expect(typeof getVisibleGameState).toBe("function");

    const visible = getVisibleGameState!(state, host);

    expect(visible.players[host].hand).toEqual([t(1, 2), t(3, 4)]);
    expect(visible.players[guest].hand).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.boneyard).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
});
});
