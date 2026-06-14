import {
    ARENA_HEIGHT,
    ARENA_WIDTH,
    gameState,
    getNextPlayerNumber
} from '../gameEngine.js';

const PLAYER_COLORS = Object.freeze([
    '#00d9ff',
    '#ff3f68',
    '#29ff9a',
    '#ffb000'
]);

/**
 * Creates the server-owned player object used by physics, scoring and rendering.
 * Socket handlers should use this factory instead of duplicating player defaults.
 */
export function createPlayer(socketId, name) {
    const players = Object.values(gameState.players);
    const playerNumber = getNextPlayerNumber();

    return {
        id: socketId,
        name,
        playerNumber,
        x: ARENA_WIDTH / 2,
        y: ARENA_HEIGHT / 2,
        dx: 0,
        dy: 0,
        color: PLAYER_COLORS[playerNumber - 1],
        isHost: !players.some(player => player.isHost),
        isAlive: true,
        score: 0
    };
}

/**
 * Returns only the public identity fields needed by notices and pause overlays.
 */
export function getPlayerIdentity(player) {
    return {
        id: player.id,
        name: player.name,
        playerNumber: player.playerNumber,
        color: player.color
    };
}

/**
 * Makes the lowest-numbered remaining player host when the old host leaves.
 */
export function ensureHost(io) {
    const players = Object.values(gameState.players);
    if (players.length === 0 || players.some(player => player.isHost)) {
        return;
    }

    const newHost = [...players]
        .sort((a, b) => a.playerNumber - b.playerNumber)[0];

    newHost.isHost = true;
    io.emit('HOST_CHANGED', {
        message: `P${newHost.playerNumber} // ${newHost.name} is now room host.`
    });
}
