import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import * as rooms from "./rooms";
import { createInitialState } from "./game/engine";
import { GameState, Tile } from "./game/types";

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function roomWithPlayers() {
  const room = createRoom(`A-${Math.random()}`);
  joinRoom(room.code, `B-${Math.random()}`);
  return room;
}

function stateBetweenHands(playerIds: string[]): GameState {
  const [playerA, playerB] = playerIds;
  return {
    ...createInitialState(playerIds),
    players: {
      [playerA]: { id: playerA, hand: [t(1, 2)], score: 25 },
      [playerB]: { id: playerB, hand: [t(3, 4)], score: 10 },
    },
    boneyard: [t(5, 6)],
    deadTiles: [t(0, 0)],
    handNumber: 3,
    handOver: true,
    gameOver: false,
  };
}

describe("rooms", () => {
  it("returns a per-player state view without hidden tile identities", () => {
    const room = roomWithPlayers();
    const [playerA, playerB] = room.players;
    room.state = stateBetweenHands(room.players);

    expect(typeof (rooms as any).getVisibleRoomState).toBe("function");
    const visible = (rooms as any).getVisibleRoomState(room.code, playerA) as GameState;

    expect(visible.players[playerA].hand).toEqual([t(1, 2)]);
    expect(visible.players[playerB].hand).toEqual([{ high: -1, low: -1 }]);
    expect(visible.boneyard).toEqual([{ high: -1, low: -1 }]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
    expect(visible.players[playerA].score).toBe(25);
    expect(visible.players[playerB].score).toBe(10);
  });

  it("rejects start requests from sockets that are not room players", () => {
    const room = roomWithPlayers();

    expect(() => startGame(room.code, "ATTACKER")).toThrow("not a player");
    expect(room.state).toBeNull();
  });

  it("does not restart a match between hands and wipe scores", () => {
    const room = roomWithPlayers();
    const [playerA, playerB] = room.players;
    room.state = stateBetweenHands(room.players);

    expect(() => startGame(room.code, playerA)).toThrow("Game is already in progress.");
    expect(room.state?.players[playerA].score).toBe(25);
    expect(room.state?.players[playerB].score).toBe(10);
    expect(room.state?.handNumber).toBe(3);
  });

  it("rejects next-hand requests from sockets that are not room players", () => {
    const room = roomWithPlayers();
    room.state = stateBetweenHands(room.players);

    expect(() => nextHand(room.code, "ATTACKER")).toThrow("not a player");
    expect(room.state?.handNumber).toBe(3);
  });
});
