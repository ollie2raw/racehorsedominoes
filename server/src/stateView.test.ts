import { describe, expect, it } from "vitest";

import { createInitialState } from "./game/engine";
import { Tile } from "./game/types";
import { stateForPlayer } from "./stateView";

function t(a: number, b: number): Tile {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

describe("stateForPlayer", () => {
  it("keeps only the requesting player's hidden tiles visible", () => {
    const state = {
      ...createInitialState(["A", "B"]),
      players: {
        A: { id: "A", hand: [t(1, 2), t(3, 4)], score: 10 },
        B: { id: "B", hand: [t(5, 6)], score: 15 },
      },
      boneyard: [t(0, 1), t(0, 2), t(0, 3)],
      deadTiles: [t(6, 6), t(5, 5)],
    };

    const view = stateForPlayer(state, "A");

    expect(view.players.A.hand).toEqual([t(1, 2), t(3, 4)]);
    expect(view.players.B.hand).toEqual([]);
    expect(view.players.B.score).toBe(15);
    expect(view.boneyard).toHaveLength(3);
    expect(view.boneyard).not.toContainEqual(t(0, 1));
    expect(view.deadTiles).toEqual([]);
  });
});
