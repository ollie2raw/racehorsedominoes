"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateForPlayer = stateForPlayer;
const HIDDEN_TILE = { low: -1, high: -1 };
/**
 * Return the game state as it is safe to send to a single player.
 * Hidden-information piles keep their counts but not their tile identities.
 */
function stateForPlayer(state, playerId) {
    const players = Object.fromEntries(Object.entries(state.players).map(([id, player]) => [
        id,
        {
            ...player,
            hand: id === playerId ? player.hand : [],
        },
    ]));
    return {
        ...state,
        players,
        boneyard: state.boneyard.map(() => HIDDEN_TILE),
        deadTiles: [],
    };
}
//# sourceMappingURL=stateView.js.map