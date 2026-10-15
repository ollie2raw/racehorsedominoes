import { describe, expect, it } from "vitest";
import {
  createRoom,
  getVisibleGameState,
  joinRoom,
  nextHand,
  startGame,
} from "./rooms";

function startedRoom() {
  const room = createRoom("host");
  joinRoom(room.code, "guest");
  startGame(room.code, "host");
  if (!room.state) throw new Error("expected started room");
  return room;
}

describe("room lifecycle security", () => {
  it("requires a seated player to start a game", () => {
    const room = createRoom("host");
    joinRoom(room.code, "guest");

    expect(() => startGame(room.code, "intruder")).toThrow(/not a player/i);
    expect(room.state).toBeNull();
  });

  it("does not allow game:start to wipe scores between hands", () => {
    const room = startedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
      players: {
        ...room.state!.players,
        host: { ...room.state!.players.host, score: 25 },
      },
    };

    expect(() => startGame(room.code, "host")).toThrow(/already started/i);
    expect(room.state.players.host.score).toBe(25);
  });

  it("requires a seated player to advance to the next hand", () => {
    const room = startedRoom();
    room.state = {
      ...room.state!,
      handOver: true,
      gameOver: false,
    };

    expect(() => nextHand(room.code, "intruder")).toThrow(/not a player/i);
  });

  it("hides opponent hands, boneyard, and dead tiles in visible game state", () => {
    const room = startedRoom();
    room.state = {
      ...room.state!,
      players: {
        host: {
          ...room.state!.players.host,
          hand: [
            { low: 1, high: 2 },
            { low: 3, high: 4 },
          ],
        },
        guest: {
          ...room.state!.players.guest,
          hand: [{ low: 5, high: 6 }],
        },
      },
      boneyard: [
        { low: 0, high: 0 },
        { low: 0, high: 1 },
      ],
      deadTiles: [{ low: 2, high: 2 }],
    };

    const visible = getVisibleGameState(room.state, "host");

    expect(visible.players.host.hand).toEqual([
      { low: 1, high: 2 },
      { low: 3, high: 4 },
    ]);
    expect(visible.players.guest.hand).toEqual([{ low: -1, high: -1 }]);
    expect(visible.boneyard).toEqual([
      { low: -1, high: -1 },
      { low: -1, high: -1 },
    ]);
    expect(visible.deadTiles).toEqual([{ low: -1, high: -1 }]);
  });
});
