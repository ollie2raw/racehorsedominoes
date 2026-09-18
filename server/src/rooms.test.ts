import { describe, expect, it } from "vitest";
import * as rooms from "./rooms";
import { GameState, Tile } from "./game/types";

const hiddenTile: Tile = { high: -1, low: -1 };

function isHiddenTile(tile: Tile): boolean {
  return tile.high === hiddenTile.high && tile.low === hiddenTile.low;
}

function startGameAs(code: string, socketId: string) {
  return (rooms.startGame as unknown as (roomCode: string, actorSocketId: string) => rooms.Room)(code, socketId);
}

function nextHandAs(code: string, socketId: string) {
  return (rooms.nextHand as unknown as (roomCode: string, actorSocketId: string) => rooms.Room)(code, socketId);
}

function visibleStateFor(state: GameState, socketId: string): GameState {
  const getVisibleGameState = (rooms as unknown as {
    getVisibleGameState?: (gameState: GameState, viewerSocketId: string) => GameState;
  }).getVisibleGameState;
  expect(typeof getVisibleGameState).toBe("function");
  return getVisibleGameState!(state, socketId);
}

describe("Room lifecycle authorization", () => {
  it("rejects game start from sockets that are not seated in the room", () => {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");

    expect(() => startGameAs(room.code, "intruder")).toThrow(/Only room players/);
    expect(room.state).toBeNull();
  });

  it("rejects next hand from sockets that are not seated in the room", () => {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");
    startGameAs(room.code, "host");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };
    const handNumber = room.state.handNumber;

    expect(() => nextHandAs(room.code, "intruder")).toThrow(/Only room players/);
    expect(room.state.handNumber).toBe(handNumber);
  });

  it("does not allow game:start to reset scores between hands", () => {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");
    startGameAs(room.code, "host");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 45 },
        guest: { ...room.state!.players.guest, score: 15 },
      },
    };

    expect(() => startGameAs(room.code, "host")).toThrow(/Game is already in progress/);
    expect(room.state!.players.host.score).toBe(45);
    expect(room.state!.players.guest.score).toBe(15);
  });
});

describe("Visible room state", () => {
  it("hides opponent hands, boneyard tiles, and dead tiles while preserving counts", () => {
    const room = rooms.createRoom("host");
    rooms.joinRoom(room.code, "guest");
    startGameAs(room.code, "host");

    const state = room.state!;
    const visibleForHost = visibleStateFor(state, "host");

    expect(visibleForHost.players.host.hand).toEqual(state.players.host.hand);
    expect(visibleForHost.players.guest.hand).toHaveLength(state.players.guest.hand.length);
    expect(visibleForHost.players.guest.hand.every(isHiddenTile)).toBe(true);
    expect(visibleForHost.boneyard).toHaveLength(state.boneyard.length);
    expect(visibleForHost.boneyard.every(isHiddenTile)).toBe(true);
    expect(visibleForHost.deadTiles).toHaveLength(state.deadTiles.length);
    expect(visibleForHost.deadTiles.every(isHiddenTile)).toBe(true);
  });
});
