import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function createStartedRoom() {
  const room = createRoom(`host-${Math.random()}`);
  const guestId = `guest-${Math.random()}`;
  joinRoom(room.code, guestId);
  startGame(room.code, room.players[0]);
  if (!room.state) throw new Error("expected started room");
  return { room, hostId: room.players[0], guestId };
}

describe("room lifecycle protections", () => {
  it("only room players can start games", () => {
    const room = createRoom("host-start");
    joinRoom(room.code, "guest-start");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("does not let game:start reset scores between hands", () => {
    const { room, hostId, guestId } = createStartedRoom();

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        [hostId]: { ...room.state!.players[hostId], score: 15 },
        [guestId]: { ...room.state!.players[guestId], score: 20 },
      },
    };

    expect(() => startGame(room.code, hostId)).toThrow(/already in progress/i);
    expect(room.state!.players[hostId].score).toBe(15);
    expect(room.state!.players[guestId].score).toBe(20);
  });

  it("only room players can advance to the next hand", () => {
    const { room } = createStartedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("only room players can take game actions", () => {
    const { room } = createStartedRoom();

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow(/not a player/i);
  });
});

describe("visible game state", () => {
  it("hides opponent hands, boneyard identities, and dead tiles", () => {
    const { room, hostId, guestId } = createStartedRoom();
    const state = room.state!;

    const visible = getVisibleGameState(room, hostId);

    expect(visible.players[hostId].hand).toEqual(state.players[hostId].hand);
    expect(visible.players[guestId].hand).toHaveLength(state.players[guestId].hand.length);
    expect(visible.players[guestId].hand.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.boneyard).toHaveLength(state.boneyard.length);
    expect(visible.boneyard.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.deadTiles).toHaveLength(state.deadTiles.length);
    expect(visible.deadTiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
  });
}
);
