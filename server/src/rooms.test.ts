import { describe, expect, it } from "vitest";

import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  act,
  getVisibleGameState,
} from "./rooms";
import { GameState } from "./game/types";

function t(a: number, b: number) {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

function playableHandOverState(playerIds: string[]): GameState {
  const [a, b] = playerIds;

  return {
    config: {
      maxPips: 6,
      tilesPerPlayer: 7,
      deadTileCount: 2,
      scoringMultiple: 5,
      blockedHandRule: "lowestPips",
      endHandBonus: "sumOpponentPenalties",
      winningScore: 60,
    },
    playerIds,
    players: {
      [a]: { id: a, hand: [t(1, 2)], score: 25 },
      [b]: { id: b, hand: [t(3, 4)], score: 10 },
    },
    board: null,
    boneyard: [t(5, 6)],
    deadTiles: [t(0, 0)],
    currentPlayerIndex: 0,
    handNumber: 1,
    handOpen: false,
    handOver: true,
    gameOver: false,
    winnerId: null,
    consecutivePasses: 0,
  };
}

describe("room security and state visibility", () => {
  it("rejects game starts from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next-hand requests from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = playableHandOverState(room.players);

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(1);
  });

  it("rejects actions from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = playableHandOverState(room.players);
    room.state = { ...room.state, handOver: false };

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow(/not a player/i);
  });

  it("does not let game:start reset scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    room.state = playableHandOverState(room.players);

    expect(() => startGame(room.code, "host")).toThrow(/next hand/i);
    expect(room.state.players.host.score).toBe(25);
    expect(room.state.players.guest.score).toBe(10);
    expect(room.state.handNumber).toBe(1);
  });

  it("only exposes the viewer's hand and hides shared private piles", () => {
    const state = playableHandOverState(["host", "guest"]);

    const visible = getVisibleGameState(state, "host");

    expect(visible.players.host.hand).toEqual([t(1, 2)]);
    expect(visible.players.guest.hand).toEqual([{ high: -1, low: -1 }]);
    expect(visible.boneyard).toEqual([{ high: -1, low: -1 }]);
    expect(visible.deadTiles).toEqual([{ high: -1, low: -1 }]);
  });
});
