import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function hiddenTile(tile: { high: number; low: number }) {
  expect(tile).toEqual({ high: -1, low: -1 });
}

describe("rooms security boundaries", () => {
  it("returns only the viewer's hand and masks hidden tile pools", () => {
    const room = createRoom("A");
    joinRoom(room.code, "B");
    startGame(room.code, "A");

    const rawState = getRoom(room.code).state;
    expect(rawState).not.toBeNull();

    const visibleToA = getVisibleGameState(rawState!, "A");

    expect(visibleToA.players.A.hand).toEqual(rawState!.players.A.hand);
    expect(visibleToA.players.B.hand).toHaveLength(rawState!.players.B.hand.length);
    visibleToA.players.B.hand.forEach(hiddenTile);
    expect(visibleToA.boneyard).toHaveLength(rawState!.boneyard.length);
    expect(visibleToA.deadTiles).toHaveLength(rawState!.deadTiles.length);
    visibleToA.boneyard.forEach(hiddenTile);
    visibleToA.deadTiles.forEach(hiddenTile);

    expect(rawState!.players.B.hand.every((tile) => tile.high >= 0 && tile.low >= 0)).toBe(true);
  });

  it("rejects lifecycle controls from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow("Player is not in this room.");

    startGame(room.code, "host");
    const started = getRoom(room.code);
    started.state = { ...started.state!, handOver: true };

    expect(() => nextHand(room.code, "intruder")).toThrow("Player is not in this room.");
  });

  it("rejects actions from sockets that are not room players", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow(
      "Player is not in this room."
    );
  });

  it("does not allow game:start to wipe scores between hands", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");
    startGame(room.code, "host");

    const activeRoom = getRoom(room.code);
    activeRoom.state = {
      ...activeRoom.state!,
      handOver: true,
      players: {
        ...activeRoom.state!.players,
        host: { ...activeRoom.state!.players.host, score: 25 },
        guest: { ...activeRoom.state!.players.guest, score: 10 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow("Game is already in progress.");
    expect(activeRoom.state!.players.host.score).toBe(25);
    expect(activeRoom.state!.players.guest.score).toBe(10);

    nextHand(room.code, "guest");
    expect(activeRoom.state!.players.host.score).toBe(25);
    expect(activeRoom.state!.players.guest.score).toBe(10);
  });
});
