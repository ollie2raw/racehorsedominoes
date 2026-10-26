import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";
import * as rooms from "./rooms";

describe("room security and lifecycle", () => {
  function startedRoom() {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    return startGame(room.code, "host");
  }

  it("rejects game starts from sockets that are not seated in the room", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("does not let game:start reset scores between hands", () => {
    const room = startedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 35 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow(/already started/i);
    expect(room.state.players.host.score).toBe(35);
  });

  it("rejects next-hand requests from sockets that are not seated in the room", () => {
    const room = startedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handOver).toBe(true);
  });

  it("masks hidden tiles in visible state for each player", () => {
    const room = startedRoom();
    const getVisibleGameState = (rooms as any).getVisibleGameState;

    expect(typeof getVisibleGameState).toBe("function");

    const visible = getVisibleGameState(room.state, "host");

    expect(visible.players.host.hand).toEqual(room.state!.players.host.hand);
    expect(visible.players.guest.hand).toEqual(
      room.state!.players.guest.hand.map(() => ({ high: -1, low: -1 }))
    );
    expect(visible.boneyard).toEqual(
      room.state!.boneyard.map(() => ({ high: -1, low: -1 }))
    );
    expect(visible.deadTiles).toEqual(
      room.state!.deadTiles.map(() => ({ high: -1, low: -1 }))
    );
  });
});
