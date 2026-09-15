import { describe, expect, it } from "vitest";

import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

const HIDDEN_TILE = { high: -1, low: -1 };

function createTwoPlayerRoom(prefix: string) {
  const hostId = `${prefix}-host`;
  const guestId = `${prefix}-guest`;
  const room = createRoom(hostId);
  joinRoom(room.code, guestId);
  return { room, hostId, guestId };
}

describe("rooms", () => {
  it("masks opponent hands and undealt tiles in visible state", () => {
    const { room, hostId, guestId } = createTwoPlayerRoom("visible");
    startGame(room.code, hostId);

    const fullState = room.state!;
    const visibleToHost = getVisibleGameState(fullState, hostId);

    expect(visibleToHost.players[hostId].hand).toEqual(
      fullState.players[hostId].hand
    );
    expect(visibleToHost.players[guestId].hand).toEqual(
      fullState.players[guestId].hand.map(() => HIDDEN_TILE)
    );
    expect(visibleToHost.boneyard).toEqual(
      fullState.boneyard.map(() => HIDDEN_TILE)
    );
    expect(visibleToHost.deadTiles).toEqual(
      fullState.deadTiles.map(() => HIDDEN_TILE)
    );
  });

  it("rejects game starts from sockets that are not seated in the room", () => {
    const { room } = createTwoPlayerRoom("start-auth");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects restarting between hands because it would reset scores", () => {
    const { room, hostId } = createTwoPlayerRoom("restart");
    startGame(room.code, hostId);

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        [hostId]: {
          ...room.state!.players[hostId],
          score: 42,
        },
      },
    };

    expect(() => startGame(room.code, hostId)).toThrow(/already started/i);
    expect(room.state?.players[hostId].score).toBe(42);
  });

  it("rejects next hand requests from sockets that are not seated in the room", () => {
    const { room, hostId } = createTwoPlayerRoom("next-auth");
    startGame(room.code, hostId);
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(1);
  });
});
