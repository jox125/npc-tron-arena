// Game dimensions configuration
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 800;

// --- AUTHORITATIVE CORE GAME LOOP ---
export let gameState = {
    gameStatus: "LOBBY", // LOBBY, COUNTDOWN, PLAYING, PAUSED, GAME_OVER
    timer: 0,
    players: {},         // Keyed by socket.id
    trails: []           // Array of solid trail line rectangles
};

/**
 * Authoritative Physics Engine Update
 * Runs 30 times a second to update continuous coordinates
 */
export function updateGamePhysics() {
    Object.values(gameState.players).forEach(player => {
        if (!player.isAlive) return;

        // Apply continuous physics vectors
        player.x += player.dx;
        player.y += player.dy;

        // TODO: Handle screen wrapping calculations here
        // TODO: Update active trail line dimensions here
        // TODO: Process trail collision interception mechanics here
    });
}

export function getNextPlayerNumber() {
    const existingNumbers = Object.values(gameState.players).map(p => p.playerNumber);
    for (let i = 1; i <= 4; i++) {
        if (!existingNumbers.includes(i)) return i;
    }
    return 1;
}