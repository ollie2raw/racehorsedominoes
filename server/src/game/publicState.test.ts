import { describe, expect, it } from "vitest";
import { getVisibleGameState } from "./publicState";
import { createInitialState } from "./engine";
import { GameState, Tile } from "./types";

function t(low: number, high: number): Tile {
  return { low, high };
}

describe("visible game state", () => {
  it("only reveals the viewing player's private tiles", () => {
    const state: GameState = {
      ...createInitialState(["player-a", "player-b"]),
      players: {
        "player-a": { id: "player-a", hand: [t(1, 2), t(3, 4)], score: 10 },
        "player-b": { id: "player-b", hand: [t(5, 6), t(0, 0)], score: 15 },
      },
      boneyard: [t(2, 2), t(4, 5)],
      deadTiles: [t(1, 1), t(3, 3)],
    };

    const visible = getVisibleGameState(state, "player-a");

    expect(visible.players["player-a"].hand).toEqual([t(1, 2), t(3, 4)]);
    expect(visible.players["player-b"].hand).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.boneyard).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
    expect(visible.deadTiles).toEqual([
      { high: -1, low: -1 },
      { high: -1, low: -1 },
    ]);
  });
});
