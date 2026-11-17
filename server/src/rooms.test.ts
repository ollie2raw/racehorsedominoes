import { describe, expect, it } from "vitest";

import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function makeStartedRoom() {
  const room = createRoom(`host-${Math.random()}`);
  joinRoom(room.code, `guest-${Math.random()}`);
  startGame(room.code, room.players[0]);
  return room;
}

describe("room security and lifecycle invariants", () => {
  it("rejects startGame from sockets that are not seated in the room", () => {
    const room = createRoom("host-start-auth");
    joinRoom(room.code, "guest-start-auth");

    expect(() => startGame(room.code, "intruder")).toThrow("not a player");
  });

  it("rejects nextHand from sockets that are not seated in the room", () => {
    const room = makeStartedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow("not a player");
  });

  it("does not let game:start reset an in-progress match between hands", () => {
    const room = makeStartedRoom();
    const [hostId, guestId] = room.players;

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        [hostId]: { ...room.state!.players[hostId], score: 41 },
        [guestId]: { ...room.state!.players[guestId], score: 12 },
      },
    };

    expect(() => startGame(room.code, hostId)).toThrow("already in progress");
    expect(room.state?.players[hostId].score).toBe(41);
    expect(room.state?.players[guestId].score).toBe(12);
  });

  it("returns visible state that only exposes the requesting player's hidden tiles", () => {
    const room = makeStartedRoom();
    const [hostId, guestId] = room.players;

    const visible = getVisibleGameState(room.state!, hostId);

    expect(visible.players[hostId].hand).toEqual(room.state!.players[hostId].hand);
    expect(visible.players[guestId].hand).toHaveLength(room.state!.players[guestId].hand.length);
    expect(visible.players[guestId].hand.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.boneyard).toHaveLength(room.state!.boneyard.length);
    expect(visible.boneyard.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.deadTiles).toHaveLength(room.state!.deadTiles.length);
    expect(visible.deadTiles.every(tile => tile.high === -1 && tile.low === -1)).toBe(true);
  });

  it("rejects actions from sockets that are not seated in the room", () => {
    const room = makeStartedRoom();

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow("not a player");
  });
});
