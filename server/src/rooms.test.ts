import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, nextHand, startGame } from "./rooms";

describe("room lifecycle authorization", () => {
  it("rejects game start attempts from sockets that are not room players", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow("Not a room member.");
  });

  it("does not allow startGame to reset scores between hands", () => {
    const room = createRoom("score-a");
    joinRoom(room.code, "score-b");
    startGame(room.code, "score-a");

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        "score-a": { ...room.state!.players["score-a"], score: 45 },
        "score-b": { ...room.state!.players["score-b"], score: 25 },
      },
    };

    expect(() => startGame(room.code, "score-a")).toThrow(
      "Hand is over. Start the next hand instead."
    );
    expect(room.state.players["score-a"].score).toBe(45);
    expect(room.state.players["score-b"].score).toBe(25);
  });

  it("rejects next-hand attempts from sockets that are not room players", () => {
    const room = createRoom("next-a");
    joinRoom(room.code, "next-b");
    startGame(room.code, "next-a");

    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow("Not a room member.");
  });
});
