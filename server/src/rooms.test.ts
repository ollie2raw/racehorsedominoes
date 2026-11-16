import { describe, expect, it } from "vitest";
import * as rooms from "./rooms";

describe("room security and state visibility", () => {
  function createStartedRoom() {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");
    rooms.startGame(room.code, "host");
    expect(room.state).not.toBeNull();
    return room;
  }

  it("rejects game start requests from sockets that are not seated players", () => {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");

    expect(() => rooms.startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("rejects next-hand requests from sockets that are not seated players", () => {
    const room = createStartedRoom();
    room.state = {
      ...room.state!,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 12 },
      },
      handOver: true,
      gameOver: false,
    };
    const previousHandNumber = room.state.handNumber;

    expect(() => rooms.nextHand(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state.handNumber).toBe(previousHandNumber);
    expect(room.state.players.host.score).toBe(12);
  });

  it("rejects game actions from sockets that are not seated players", () => {
    const room = createStartedRoom();
    const previousState = room.state;

    expect(() => rooms.act(room.code, "intruder", { type: "PASS" })).toThrow(/not a player/i);
    expect(room.state).toBe(previousState);
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = createStartedRoom();
    room.state = {
      ...room.state!,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 25 },
      },
      handOver: true,
      gameOver: false,
    };

    expect(() => rooms.startGame(room.code, "host")).toThrow(/already started|next hand/i);
    expect(room.state.players.host.score).toBe(25);
  });

  it("returns only the requesting player's private tile identities", () => {
    const room = createStartedRoom();
    const rawState = room.state!;
    const getVisibleGameState = (rooms as any).getVisibleGameState;

    expect(getVisibleGameState).toBeTypeOf("function");
    const visible = getVisibleGameState(rawState, "host");

    expect(visible.players.host.hand).toEqual(rawState.players.host.hand);
    expect(visible.players.guest.hand).toHaveLength(rawState.players.guest.hand.length);
    expect(visible.players.guest.hand.every((tile: any) => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.boneyard).toHaveLength(rawState.boneyard.length);
    expect(visible.boneyard.every((tile: any) => tile.high === -1 && tile.low === -1)).toBe(true);
    expect(visible.deadTiles).toHaveLength(rawState.deadTiles.length);
    expect(visible.deadTiles.every((tile: any) => tile.high === -1 && tile.low === -1)).toBe(true);
  });
});
