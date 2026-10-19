import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getVisibleGameState,
} from "./rooms";

function hiddenTiles(length: number) {
  return Array.from({ length }, () => ({ high: -1, low: -1 }));
}

describe("room security and lifecycle", () => {
  it("does not allow starting an existing match to wipe between-hand scores", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        host: { ...room.state!.players.host, score: 25 },
        guest: { ...room.state!.players.guest, score: 15 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow("Game is already in progress.");
    expect(room.state?.players.host.score).toBe(25);
    expect(room.state?.players.guest.score).toBe(15);
  });

  it("requires the caller to be a room player before starting a game", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow("Not a player in this room.");
    expect(room.state).toBeNull();
  });

  it("requires the caller to be a room player before advancing hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "intruder")).toThrow("Not a player in this room.");
    expect(room.state.handNumber).toBe(1);
  });

  it("hides opponent hands and draw piles in per-player state updates", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const state = room.state!;
    const visibleToHost = getVisibleGameState(state, "host");

    expect(visibleToHost.players.host.hand).toEqual(state.players.host.hand);
    expect(visibleToHost.players.guest.hand).toEqual(hiddenTiles(state.players.guest.hand.length));
    expect(visibleToHost.boneyard).toEqual(hiddenTiles(state.boneyard.length));
    expect(visibleToHost.deadTiles).toEqual(hiddenTiles(state.deadTiles.length));
  });
});
