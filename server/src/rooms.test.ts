import { describe, expect, it } from "vitest";
import * as rooms from "./rooms";

const {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getRoom,
  act,
} = rooms;

describe("room lifecycle security", () => {
  it("rejects game starts from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(getRoom(room.code).state).toBeNull();
  });

  it("rejects next-hand requests from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const startedRoom = getRoom(room.code);
    startedRoom.state = {
      ...startedRoom.state!,
      handOver: true,
      gameOver: false,
    };
    const handNumber = startedRoom.state.handNumber;

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(getRoom(room.code).state?.handNumber).toBe(handNumber);
  });

  it("rejects game actions from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const state = getRoom(room.code).state;

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow(/not a player/i);
    expect(getRoom(room.code).state).toBe(state);
  });

  it("does not let game:start reset scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const startedRoom = getRoom(room.code);
    startedRoom.state = {
      ...startedRoom.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...startedRoom.state!.players,
        host: { ...startedRoom.state!.players.host, score: 25 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow(/already started|next hand/i);
    expect(getRoom(room.code).state?.players.host.score).toBe(25);
  });

  it("masks hidden state for each player view", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const state = getRoom(room.code).state!;
    const getVisibleGameState = (rooms as any).getVisibleGameState;

    expect(typeof getVisibleGameState).toBe("function");
    const visible = getVisibleGameState(state, "host");

    expect(visible.players.host.hand).toEqual(state.players.host.hand);
    expect(visible.players.guest.hand).toHaveLength(state.players.guest.hand.length);
    expect(visible.players.guest.hand.every((tile: { high: number; low: number }) => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.boneyard).toHaveLength(state.boneyard.length);
    expect(visible.boneyard.every((tile: { high: number; low: number }) => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.deadTiles).toHaveLength(state.deadTiles.length);
    expect(visible.deadTiles.every((tile: { high: number; low: number }) => tile.high === -1 && tile.low === -1)).toBe(true);
  });
});
