import { describe, expect, it } from "vitest";

import { createInitialState } from "./game/engine";
import { createRoom, joinRoom, startGame } from "./rooms";

describe("room lifecycle authorization", () => {
  it("rejects game start requests from sockets that are not seated in the room", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");

    expect(() => startGame(room.code, "intruder")).toThrow(/not in this room/i);
  });

  it("rejects game start between hands so accumulated scores are not reset", () => {
    const room = createRoom("score-a");
    joinRoom(room.code, "score-b");

    const state = createInitialState(room.players);
    room.state = {
      ...state,
      handNumber: 3,
      handOver: true,
      gameOver: false,
      players: {
        "score-a": { id: "score-a", hand: [], score: 35 },
        "score-b": { id: "score-b", hand: [], score: 28 },
      },
    };

    expect(() => startGame(room.code, "score-a")).toThrow(/next hand/i);
    expect(room.state.players["score-a"].score).toBe(35);
    expect(room.state.players["score-b"].score).toBe(28);
  });
});
