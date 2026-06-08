// Game dimensions configuration
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 800;

// --- AUTHORITATIVE CORE GAME LOOP ---
export let gameState = {
    gameStatus: "LOBBY", // LOBBY, COUNTDOWN, PLAYING, PAUSED, GAME_OVER
    timer: 0,
    pausedBy: null,
    roundResult: null,
    eliminationOrder: [],
    eliminatedPlayers: {},
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

export function eliminatePlayer(playerId) {
    const player = gameState.players[playerId];
    if (!player || !player.isAlive) return false;

    player.isAlive = false;
    player.eliminatedAt = Date.now();
    gameState.eliminationOrder.push(playerId);
    gameState.eliminatedPlayers[playerId] = { ...player };
    return true;
}

/**
 * Complete the active round and create the payload consumed by the results UI.
 * eliminationOrder must contain player IDs from first eliminated to last eliminated.
 */
export function finishRound(winnerId, eliminationOrder = []) {
    const winner = winnerId ? gameState.players[winnerId] : null;
    if (winnerId && !winner) return false;

    const getPlayer = id =>
        gameState.players[id] ?? gameState.eliminatedPlayers[id];
    const validEliminatedIds = [...new Set(eliminationOrder)]
        .filter(id => id !== winnerId && getPlayer(id));
    const rankedIds = winnerId
        ? [winnerId, ...validEliminatedIds.reverse()]
        : validEliminatedIds.reverse();
    const unrankedIds = Object.keys(gameState.players)
        .filter(id => !rankedIds.includes(id));

    gameState.roundResult = {
        winnerId,
        rankings: [...rankedIds, ...unrankedIds].map((id, index) => {
            const player = getPlayer(id);

            return {
                id: player.id,
                name: player.name,
                playerNumber: player.playerNumber,
                color: player.color,
                score: player.score ?? 0,
                placement: index + 1
            };
        })
    };
    gameState.pausedBy = null;
    gameState.gameStatus = "GAME_OVER";
    return true;
}

export function resetGameToLobby() {
    gameState.gameStatus = "LOBBY";
    gameState.timer = 0;
    gameState.pausedBy = null;
    gameState.roundResult = null;
    gameState.eliminationOrder = [];
    gameState.eliminatedPlayers = {};
    gameState.trails = [];

    Object.values(gameState.players).forEach(player => {
        player.x = ARENA_WIDTH / 2;
        player.y = ARENA_HEIGHT / 2;
        player.dx = 0;
        player.dy = 0;
        player.isAlive = true;
        player.score = 0;
        delete player.eliminatedAt;
    });
}
