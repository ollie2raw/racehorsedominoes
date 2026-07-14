import { GameState, PlayerState, Tile } from "./types";

const HIDDEN_TILE: Tile = { high: -1, low: -1 };

function hiddenTiles(count: number): Tile[] {
  return Array.from({ length: count }, () => ({ ...HIDDEN_TILE }));
}

export function getVisibleGameState(
  state: GameState,
  viewerPlayerId: string
): GameState {
  const players: Record<string, PlayerState> = {};

  for (const playerId of state.playerIds) {
    const player = state.players[playerId];
    players[playerId] = {
      ...player,
      hand:
        playerId === viewerPlayerId
          ? player.hand
          : hiddenTiles(player.hand.length),
    };
  }

  return {
    ...state,
    players,
    boneyard: hiddenTiles(state.boneyard.length),
    deadTiles: hiddenTiles(state.deadTiles.length),
  };
}
