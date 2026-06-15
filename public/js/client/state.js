/**
 * Two server snapshots are kept so the renderer can interpolate movement.
 */
export const renderState = {
    current: {},
    previous: {},
    lastUpdate: 0
};

/**
 * Stores client-only session details that are not part of server gameState.
 */
export const clientSession = {
    currentPlayerId: null,
    lobbyPlayers: [],
    currentGameStatus: 'LOBBY',
    currentGameMode: 'MULTIPLAYER',
    currentWinsRequired: 3,
    lastSystemNoticeId: null
};

export function updateRenderState(gameState) {
    renderState.previous = renderState.current;
    renderState.current = gameState;
    renderState.lastUpdate = performance.now();
}
