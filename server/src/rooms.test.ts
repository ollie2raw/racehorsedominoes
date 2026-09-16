import { describe, expect, it } from "vitest";
import {
  createRoom,
  joinRoom,
  startGame,
  getVisibleGameState,
} from "./rooms";

const HIDDEN_TILE = { high: -1, low: -1 };

describe("room state visibility", () => {
  it("hides opponent hands and undealt tiles while preserving counts", () => {
    const room = createRoom("player-a");
    joinRoom(room.code, "player-b");
    const started = startGame(room.code);

    expect(started.state).not.toBeNull();
    const rawState = started.state!;
    const visibleToA = getVisibleGameState(rawState, "player-a");

    expect(visibleToA.players["player-a"].hand).toEqual(rawState.players["player-a"].hand);
    expect(visibleToA.players["player-b"].hand).toHaveLength(rawState.players["player-b"].hand.length);
    expect(visibleToA.players["player-b"].hand).toEqual(
      rawState.players["player-b"].hand.map(() => HIDDEN_TILE)
    );
    expect(visibleToA.boneyard).toEqual(rawState.boneyard.map(() => HIDDEN_TILE));
    expect(visibleToA.deadTiles).toEqual(rawState.deadTiles.map(() => HIDDEN_TILE));

    const visibleToB = getVisibleGameState(rawState, "player-b");

    expect(visibleToB.players["player-b"].hand).toEqual(rawState.players["player-b"].hand);
    expect(visibleToB.players["player-a"].hand).toEqual(
      rawState.players["player-a"].hand.map(() => HIDDEN_TILE)
    );
  });
});
