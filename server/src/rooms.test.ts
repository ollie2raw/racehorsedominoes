import { describe, expect, it } from "vitest";
import {
  act,
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function createTwoPlayerRoom() {
  const room = createRoom("A");
  joinRoom(room.code, "B");
  return room;
}

describe("room security and state visibility", () => {
  it("shows each player only their own hand and hides draw/dead tile identities", () => {
    const room = createTwoPlayerRoom();
    startGame(room.code, "A");

    const fullState = room.state!;
    const visibleToA = getVisibleGameState(fullState, "A");
    const visibleToB = getVisibleGameState(fullState, "B");

    expect(visibleToA.players.A.hand).toEqual(fullState.players.A.hand);
    expect(visibleToA.players.B.hand).toEqual(
      fullState.players.B.hand.map(() => ({ high: -1, low: -1 }))
    );
    expect(visibleToB.players.B.hand).toEqual(fullState.players.B.hand);
    expect(visibleToB.players.A.hand).toEqual(
      fullState.players.A.hand.map(() => ({ high: -1, low: -1 }))
    );

    expect(visibleToA.boneyard).toEqual(
      fullState.boneyard.map(() => ({ high: -1, low: -1 }))
    );
    expect(visibleToA.deadTiles).toEqual(
      fullState.deadTiles.map(() => ({ high: -1, low: -1 }))
    );
  });

  it("rejects non-player game actions for a room", () => {
    const room = createTwoPlayerRoom();

    expect(() => startGame(room.code, "intruder")).toThrow(
      /not a player/i
    );

    startGame(room.code, "A");
    room.state = { ...room.state!, handOver: true, gameOver: false };

    expect(() => nextHand(room.code, "intruder")).toThrow(
      /not a player/i
    );
    expect(() =>
      act(room.code, "intruder", { type: "PASS" })
    ).toThrow(/not a player/i);
  });

  it("does not let game:start reset scores between hands", () => {
    const room = createTwoPlayerRoom();
    startGame(room.code, "A");
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        A: { ...room.state!.players.A, score: 25 },
        B: { ...room.state!.players.B, score: 10 },
      },
    };

    expect(() => startGame(room.code, "A")).toThrow(
      /already in progress/i
    );
    expect(room.state.players.A.score).toBe(25);
    expect(room.state.players.B.score).toBe(10);
  });
});
