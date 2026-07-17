import { describe, expect, it } from "vitest";

import * as rooms from "./rooms";
import { GameState } from "./game/types";

function uniqueId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function roomWithPlayers() {
  const room = rooms.createRoom(uniqueId("host"));
  rooms.joinRoom(room.code, uniqueId("guest"));
  return room;
}

function startedRoom() {
  const room = roomWithPlayers();
  rooms.startGame(room.code, room.players[0]);
  expect(room.state).not.toBeNull();
  return room as typeof room & { state: GameState };
}

describe("room lifecycle authorization", () => {
  it("rejects game start from a socket that is not seated in the room", () => {
    const room = roomWithPlayers();

    expect(() => rooms.startGame(room.code, uniqueId("intruder"))).toThrow(
      "not a player"
    );
  });

  it("rejects next hand from a socket that is not seated in the room", () => {
    const room = startedRoom();
    room.state = {
      ...room.state,
      handOver: true,
      gameOver: false,
    };

    expect(() => rooms.nextHand(room.code, uniqueId("intruder"))).toThrow(
      "not a player"
    );
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = startedRoom();
    const playerId = room.players[0];
    room.state = {
      ...room.state,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state.players,
        [playerId]: {
          ...room.state.players[playerId],
          score: 25,
        },
      },
    };

    expect(() => rooms.startGame(room.code, playerId)).toThrow(
      "Game is already in progress"
    );
    expect(room.state.players[playerId].score).toBe(25);
  });
});

describe("visible game state", () => {
  it("hides opponent hands, boneyard tiles, and dead tiles from each player", () => {
    const room = startedRoom();
    const viewerId = room.players[0];
    const opponentId = room.players[1];
    const visible = rooms.getVisibleGameState(room.state, viewerId);

    expect(visible.players[viewerId].hand).toEqual(
      room.state.players[viewerId].hand
    );
    expect(visible.players[opponentId].hand).toHaveLength(
      room.state.players[opponentId].hand.length
    );
    expect(
      visible.players[opponentId].hand.every(
        (tile) => tile.high === -1 && tile.low === -1
      )
    ).toBe(true);
    expect(visible.boneyard).toHaveLength(room.state.boneyard.length);
    expect(
      visible.boneyard.every((tile) => tile.high === -1 && tile.low === -1)
    ).toBe(true);
    expect(visible.deadTiles).toHaveLength(room.state.deadTiles.length);
    expect(
      visible.deadTiles.every((tile) => tile.high === -1 && tile.low === -1)
    ).toBe(true);
  });
});
