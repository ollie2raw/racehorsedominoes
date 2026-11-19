import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
  type Room,
} from "./rooms";
import { Tile } from "./game/types";

const startGameFor = startGame as unknown as (code: string, socketId: string) => Room;
const nextHandFor = nextHand as unknown as (code: string, socketId: string) => Room;

function isHiddenTile(tile: Tile): boolean {
  return tile.high === -1 && tile.low === -1;
}

describe("rooms authorization", () => {
  it("rejects game start attempts from sockets outside the room", () => {
    const room = createRoom("HOST");
    joinRoom(room.code, "GUEST");

    expect(() => startGameFor(room.code, "INTRUDER")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("does not reset scores when game:start is repeated between hands", () => {
    const room = createRoom("HOST");
    joinRoom(room.code, "GUEST");
    startGameFor(room.code, "HOST");

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        HOST: { ...room.state!.players.HOST, score: 35 },
        GUEST: { ...room.state!.players.GUEST, score: 20 },
      },
    };

    expect(() => startGameFor(room.code, "HOST")).toThrow(/already started/i);
    expect(room.state!.players.HOST.score).toBe(35);
    expect(room.state!.players.GUEST.score).toBe(20);
  });

  it("rejects next-hand attempts from sockets outside the room", () => {
    const room = createRoom("HOST");
    joinRoom(room.code, "GUEST");
    startGameFor(room.code, "HOST");
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHandFor(room.code, "INTRUDER")).toThrow(/not a player/i);
    expect(room.state!.handNumber).toBe(1);
  });

  it("rejects actions from sockets outside the room before reaching engine state", () => {
    const room = createRoom("HOST");
    joinRoom(room.code, "GUEST");
    startGameFor(room.code, "HOST");

    expect(() => act(room.code, "INTRUDER", { type: "PASS" })).toThrow(/not a player/i);
  });
});

describe("visible room state", () => {
  it("hides opponent hands and draw piles while preserving counts", () => {
    const room = createRoom("HOST");
    joinRoom(room.code, "GUEST");
    startGameFor(room.code, "HOST");

    const visible = getVisibleGameState(room.state!, "HOST");

    expect(visible.players.HOST.hand).toEqual(room.state!.players.HOST.hand);
    expect(visible.players.GUEST.hand).toHaveLength(room.state!.players.GUEST.hand.length);
    expect(visible.players.GUEST.hand.every(isHiddenTile)).toBe(true);
    expect(visible.boneyard).toHaveLength(room.state!.boneyard.length);
    expect(visible.boneyard.every(isHiddenTile)).toBe(true);
    expect(visible.deadTiles).toHaveLength(room.state!.deadTiles.length);
    expect(visible.deadTiles.every(isHiddenTile)).toBe(true);
  });
});
