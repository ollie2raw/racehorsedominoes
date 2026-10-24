import { describe, expect, it } from "vitest";

import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getVisibleGameState,
} from "./rooms";
import { GameState, Tile } from "./game/types";

function hiddenTile(): Tile {
  return { high: -1, low: -1 };
}

function finishHand(state: GameState): GameState {
  return {
    ...state,
    handOver: true,
    gameOver: false,
    players: {
      ...state.players,
      host: { ...state.players.host, score: 35 },
    },
  };
}

describe("room security", () => {
  it("rejects game start from sockets that are not seated in the room", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/player|room/i);
    expect(room.state).toBeNull();
  });

  it("does not wipe scores by restarting a completed hand before game over", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = finishHand(room.state!);

    expect(() => startGame(room.code, "host")).toThrow(/already|next hand/i);
    expect(room.state!.players.host.score).toBe(35);
  });

  it("rejects next-hand requests from sockets that are not seated in the room", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = finishHand(room.state!);
    const handNumber = room.state!.handNumber;

    expect(() => nextHand(room.code, "intruder")).toThrow(/player|room/i);
    expect(room.state!.handNumber).toBe(handNumber);
  });

  it("masks hidden tiles when exposing game state to one player", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const visible = getVisibleGameState(room.state!, "host");

    expect(visible.players.host.hand).toEqual(room.state!.players.host.hand);
    expect(visible.players.guest.hand).toEqual(
      Array.from({ length: room.state!.players.guest.hand.length }, hiddenTile)
    );
    expect(visible.boneyard).toEqual(
      Array.from({ length: room.state!.boneyard.length }, hiddenTile)
    );
    expect(visible.deadTiles).toEqual(
      Array.from({ length: room.state!.deadTiles.length }, hiddenTile)
    );
  });
});
