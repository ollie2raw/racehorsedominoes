import { GameState, Tile } from "./game/types";

const HIDDEN_TILE: Tile = { low: -1, high: -1 };

/**
 * Return the game state as it is safe to send to a single player.
 * Hidden-information piles keep their counts but not their tile identities.
 */
export function stateForPlayer(state: GameState, playerId: string): GameState {
  const players = Object.fromEntries(
    Object.entries(state.players).map(([id, player]) => [
      id,
      {
        ...player,
        hand: id === playerId ? player.hand : [],
      },
    ])
  );

  return {
    ...state,
    players,
    boneyard: state.boneyard.map(() => HIDDEN_TILE),
    deadTiles: [],
  };
}
