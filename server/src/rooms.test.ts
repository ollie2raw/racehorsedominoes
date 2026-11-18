import { describe, expect, it } from "vitest";

import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import { DEFAULT_CONFIG, GameState, Tile } from "./game/types";

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function handOverState(playerIds: [string, string]): GameState {
  const [host, guest] = playerIds;
  return {
    config: DEFAULT_CONFIG,
    playerIds,
    players: {
      [host]: { id: host, hand: [t(1, 2)], score: 35 },
      [guest]: { id: guest, hand: [t(3, 4), t(5, 6)], score: 20 },
    },
    board: null,
    boneyard: [t(0, 0)],
    deadTiles: [t(1, 1)],
    currentPlayerIndex: 0,
    handNumber: 3,
    handOpen: false,
    handOver: true,
    gameOver: false,
    winnerId: null,
    consecutivePasses: 0,
  };
}

describe("rooms security and lifecycle", () => {
  it("requires a seated player to start a game", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("requires a seated player to advance to the next hand", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = handOverState(["host", "guest"]);
    const previousState = room.state;

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBe(previousState);
  });

  it("requires a seated player to act", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = {
      ...handOverState(["host", "guest"]),
      handOver: false,
      handOpen: true,
    };

    expect(() =>
      act(room.code, "intruder", {
        type: "MOVE",
        move: { tile: t(1, 2), position: "left" },
      })
    ).toThrow(/not a player/i);
  });

  it("does not reset scores by starting a new game between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = handOverState(["host", "guest"]);

    expect(() => startGame(room.code, "host")).toThrow(/already in progress/i);
    expect(room.state?.players.host.score).toBe(35);
    expect(room.state?.players.guest.score).toBe(20);
    expect(room.state?.handNumber).toBe(3);
  });

  it("only exposes each player their own hand and public tile counts", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const rawState = room.state;
    expect(rawState).not.toBeNull();

    const hostView = getVisibleGameState(room.code, "host");
    const guestView = getVisibleGameState(room.code, "guest");

    expect(hostView.players.host.hand).toEqual(rawState?.players.host.hand);
    expect(hostView.players.guest.hand).toEqual(
      rawState?.players.guest.hand.map(() => ({ high: -1, low: -1 }))
    );
    expect(hostView.boneyard).toEqual(
      rawState?.boneyard.map(() => ({ high: -1, low: -1 }))
    );
    expect(hostView.deadTiles).toEqual(
      rawState?.deadTiles.map(() => ({ high: -1, low: -1 }))
    );

    expect(guestView.players.guest.hand).toEqual(rawState?.players.guest.hand);
    expect(guestView.players.host.hand).toEqual(
      rawState?.players.host.hand.map(() => ({ high: -1, low: -1 }))
    );
  });
});
