"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisibleGameState = getVisibleGameState;
const HIDDEN_TILE = { high: -1, low: -1 };
function hiddenTiles(count) {
    return Array.from({ length: count }, () => ({ ...HIDDEN_TILE }));
}
function getVisibleGameState(state, viewerPlayerId) {
    const players = {};
    for (const playerId of state.playerIds) {
        const player = state.players[playerId];
        players[playerId] = {
            ...player,
            hand: playerId === viewerPlayerId
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
//# sourceMappingURL=publicState.js.map