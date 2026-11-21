import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function hidden(tile: { high: number; low: number }) {
  return tile.high === -1 && tile.low === -1;
}

function createStartedRoom(prefix: string) {
  const playerA = `${prefix}-A`;
  const playerB = `${prefix}-B`;
  const room = createRoom(playerA);
  joinRoom(room.code, playerB);
  startGame(room.code, playerA);
  if (!room.state) throw new Error("Expected game to be started.");
  return { room, playerA, playerB };
}

describe("rooms security and visibility", () => {
  it("masks opponent hands, boneyard, and dead tiles for each player", () => {
    const { room, playerA, playerB } = createStartedRoom("mask");
    const raw = room.state!;

    const visibleToA = getVisibleGameState(raw, playerA);
    const visibleToB = getVisibleGameState(raw, playerB);

    expect(visibleToA.players[playerA].hand).toEqual(raw.players[playerA].hand);
    expect(visibleToA.players[playerB].hand).toHaveLength(raw.players[playerB].hand.length);
    expect(visibleToA.players[playerB].hand.every(hidden)).toBe(true);
    expect(visibleToA.boneyard).toHaveLength(raw.boneyard.length);
    expect(visibleToA.boneyard.every(hidden)).toBe(true);
    expect(visibleToA.deadTiles).toHaveLength(raw.deadTiles.length);
    expect(visibleToA.deadTiles.every(hidden)).toBe(true);

    expect(visibleToB.players[playerB].hand).toEqual(raw.players[playerB].hand);
    expect(visibleToB.players[playerA].hand).toHaveLength(raw.players[playerA].hand.length);
    expect(visibleToB.players[playerA].hand.every(hidden)).toBe(true);
  });

  it("rejects room controls from sockets that are not players", () => {
    const room = createRoom("control-host");
    joinRoom(room.code, "control-guest");

    expect(() => startGame(room.code, "control-intruder")).toThrow(
      "You are not a player in this room."
    );

    startGame(room.code, "control-host");
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "control-intruder")).toThrow(
      "You are not a player in this room."
    );
  });

  it("rejects actions from sockets that are not players before reaching the engine", () => {
    const { room } = createStartedRoom("action");
    const currentPlayer = room.state!.playerIds[room.state!.currentPlayerIndex];
    const currentTile = room.state!.players[currentPlayer].hand[0];

    expect(() =>
      act(room.code, "action-intruder", {
        type: "MOVE",
        move: { tile: currentTile, position: "left" },
      })
    ).toThrow("You are not a player in this room.");
  });

  it("does not allow game:start to wipe scores between hands", () => {
    const { room, playerA } = createStartedRoom("restart");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        [playerA]: { ...room.state!.players[playerA], score: 25 },
      },
    };

    expect(() => startGame(room.code, playerA)).toThrow("Game is already in progress.");
    expect(room.state?.players[playerA].score).toBe(25);
  });
});
