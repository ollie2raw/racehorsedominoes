import { describe, expect, it } from "vitest";

import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

const HIDDEN_TILE = { high: -1, low: -1 };

function createStartedRoom() {
  const room = createRoom("player-a");
  joinRoom(room.code, "player-b");
  startGame(room.code, "player-a");
  if (!room.state) throw new Error("test setup failed to start game");
  return room;
}

describe("room state visibility", () => {
  it("hides opponent hands and draw piles while preserving counts", () => {
    const room = createStartedRoom();
    const state = room.state!;

    const visibleToA = getVisibleGameState(state, "player-a");

    expect(visibleToA.players["player-a"].hand).toEqual(state.players["player-a"].hand);
    expect(visibleToA.players["player-b"].hand).toEqual(
      Array.from({ length: state.players["player-b"].hand.length }, () => HIDDEN_TILE)
    );
    expect(visibleToA.boneyard).toEqual(
      Array.from({ length: state.boneyard.length }, () => HIDDEN_TILE)
    );
    expect(visibleToA.deadTiles).toEqual(
      Array.from({ length: state.deadTiles.length }, () => HIDDEN_TILE)
    );
  });
});

describe("room action authorization", () => {
  it("rejects game starts from sockets that are not room players", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("does not allow game:start to reset a match after a hand ends", () => {
    const room = createStartedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => startGame(room.code, "player-a")).toThrow(/already started/i);
  });

  it("rejects next-hand requests from sockets that are not room players", () => {
    const room = createStartedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("rejects game actions from sockets that are not room players", () => {
    const room = createStartedRoom();

    expect(() => act(room.code, "intruder", { type: "PASS" })).toThrow(/not a player/i);
  });
});
