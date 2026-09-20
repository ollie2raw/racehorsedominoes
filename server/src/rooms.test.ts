import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  startGame,
  nextHand,
  getVisibleGameState,
} from "./rooms";

describe("rooms lifecycle authorization", () => {
  it("rejects game starts from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow("Player is not in this room.");
  });

  it("rejects next-hand requests from sockets that are not seated players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow("Player is not in this room.");
  });

  it("does not reset scores by starting a fresh game between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 25 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow("Hand is over. Start the next hand instead.");
    expect(room.state?.players.host.score).toBe(25);
  });
});

describe("room state visibility", () => {
  it("only exposes the viewer hand and masks hidden tile identities", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const visibleToHost = getVisibleGameState(room.state!, "host");

    expect(visibleToHost.players.host.hand).toEqual(room.state!.players.host.hand);
    expect(visibleToHost.players.guest.hand).toHaveLength(room.state!.players.guest.hand.length);
    expect(visibleToHost.players.guest.hand).toEqual(
      room.state!.players.guest.hand.map(() => ({ high: -1, low: -1 }))
    );
    expect(visibleToHost.boneyard).toHaveLength(room.state!.boneyard.length);
    expect(visibleToHost.deadTiles).toHaveLength(room.state!.deadTiles.length);
    expect(visibleToHost.boneyard.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visibleToHost.deadTiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
  });
});
