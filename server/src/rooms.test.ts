import { describe, expect, it } from "vitest";
import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  startGame,
} from "./rooms";

function isHiddenTile(tile: { high: number; low: number }): boolean {
  return tile.high === -1 && tile.low === -1;
}

describe("room state visibility and authorization", () => {
  it("only exposes a player's own hand and hides draw/dead tile identities", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    expect(room.state).not.toBeNull();
    const visibleToHost = getVisibleGameState(room.state!, "host");

    expect(visibleToHost.players.host.hand).toEqual(room.state!.players.host.hand);
    expect(visibleToHost.players.guest.hand).toHaveLength(room.state!.players.guest.hand.length);
    expect(visibleToHost.players.guest.hand.every(isHiddenTile)).toBe(true);
    expect(visibleToHost.boneyard).toHaveLength(room.state!.boneyard.length);
    expect(visibleToHost.boneyard.every(isHiddenTile)).toBe(true);
    expect(visibleToHost.deadTiles).toHaveLength(room.state!.deadTiles.length);
    expect(visibleToHost.deadTiles.every(isHiddenTile)).toBe(true);
  });

  it("rejects game lifecycle calls from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("does not allow startGame to wipe scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    expect(room.state).not.toBeNull();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 35 },
        guest: { ...room.state!.players.guest, score: 20 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow(/already in progress/i);
    expect(room.state.players.host.score).toBe(35);
    expect(room.state.players.guest.score).toBe(20);
  });

  it("rejects room configs that could corrupt scoring or exhaust resources", () => {
    const zeroMultiple = createRoom("host-a", { scoringMultiple: 0 });
    joinRoom(zeroMultiple.code, "guest-a");
    expect(() => startGame(zeroMultiple.code, "host-a")).toThrow(/invalid config/i);

    const oversizedSet = createRoom("host-b", { maxPips: 100 });
    joinRoom(oversizedSet.code, "guest-b");
    expect(() => startGame(oversizedSet.code, "host-b")).toThrow(/invalid config/i);
  });
});
