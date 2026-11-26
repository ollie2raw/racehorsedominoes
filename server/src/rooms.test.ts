import { describe, expect, it } from "vitest";
import * as rooms from "./rooms";

function createTwoPlayerRoom(config = {}) {
  const room = rooms.createRoom(`host-${crypto.randomUUID()}`, config);
  const guestId = `guest-${crypto.randomUUID()}`;
  rooms.joinRoom(room.code, guestId);
  return { room, hostId: room.players[0], guestId };
}

describe("room safety", () => {
  it("masks private state for each player while preserving public counts", () => {
    const { room, hostId, guestId } = createTwoPlayerRoom();
    (rooms as any).startGame(room.code, hostId);
    expect(room.state).not.toBeNull();

    const getVisibleGameState = (rooms as any).getVisibleGameState;
    expect(typeof getVisibleGameState).toBe("function");

    const visible = getVisibleGameState(room.state, hostId);
    const hiddenTile = { high: -1, low: -1 };

    expect(visible.players[hostId].hand).toEqual(room.state!.players[hostId].hand);
    expect(visible.players[guestId].hand).toEqual(
      room.state!.players[guestId].hand.map(() => hiddenTile)
    );
    expect(visible.boneyard).toEqual(room.state!.boneyard.map(() => hiddenTile));
    expect(visible.deadTiles).toEqual(room.state!.deadTiles.map(() => hiddenTile));
    expect(visible.board).toEqual(room.state!.board);
  });

  it("prevents non-players from starting a room by code", () => {
    const { room } = createTwoPlayerRoom();

    expect(() =>
      (rooms as any).startGame(room.code, `intruder-${crypto.randomUUID()}`)
    ).toThrow(/not a player/i);
  });

  it("does not allow startGame to wipe scores between hands", () => {
    const { room, hostId, guestId } = createTwoPlayerRoom();
    (rooms as any).startGame(room.code, hostId);
    expect(room.state).not.toBeNull();

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        [hostId]: { ...room.state!.players[hostId], score: 25 },
        [guestId]: { ...room.state!.players[guestId], score: 10 },
      },
    };

    expect(() => (rooms as any).startGame(room.code, hostId)).toThrow(
      /already started/i
    );
    expect(room.state.players[hostId].score).toBe(25);
    expect(room.state.players[guestId].score).toBe(10);
  });

  it("rejects invalid scoring config before starting a game", () => {
    const { room, hostId } = createTwoPlayerRoom({ scoringMultiple: 0 });

    expect(() => (rooms as any).startGame(room.code, hostId)).toThrow(
      /scoringMultiple/i
    );
  });
});
