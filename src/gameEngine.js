import { checkTrailCollision } from './collision.js';
import { processPowerUpCollection, maintainPowerUpTimers } from './powerUp.js';
// Game dimensions configuration
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 800;

// --- AUTHORITATIVE CORE GAME LOOP ---
export let gameState = {
    gameStatus: "LOBBY", // LOBBY, COUNTDOWN, PLAYING, PAUSED, GAME_OVER
    timer: 0,
    pausedBy: null,
    systemNotice: null,
    roundNumber: 1,
    roundStartedAt: null,
    roundPausedAt: null,
    roundPausedDurationMs: 0,
    roundElapsedMs: 0,
    winsRequired: 3,
    matchWinnerId: null,
    roundResult: null,
    eliminationOrder: [],
    eliminatedPlayers: {},
    players: {},         // Keyed by socket.id
    trails: [],           // Array of solid trail line rectangles
    powerUps: []        // Array of items: { id, type, x, y, radius: 15 }
};

/**
 * Authoritative Physics Engine Update
 * Runs 30 times a second to update continuous coordinates
 */
export function updateGamePhysics() {
    Object.values(gameState.players).forEach(player => {
        if (!player.isAlive) return;

        player.teleported = false;

        maintainPowerUpTimers(player, gameState);

        // Apply continuous physics vectors
        player.x += player.dx;
        player.y += player.dy;

        // Track leading segment expansion values
        const currentSegment = gameState.trails.find(t => t.id === player.currentTrailId);
        if (currentSegment) {
            currentSegment.x2 = player.x;
            currentSegment.y2 = player.y;
        }
        // Handle screen wrapping calculations
        let crossedBoundary = false;
        if (player.x > ARENA_WIDTH)  { player.x = 0; crossedBoundary = true; }
        else if (player.x < 0)       { player.x = ARENA_WIDTH; crossedBoundary = true; }
        else if (player.y > ARENA_HEIGHT) { player.y = 0; crossedBoundary = true; }
        else if (player.y < 0)       { player.y = ARENA_HEIGHT; crossedBoundary = true; }

        // If wrapped, break the laser link so it doesn't draw diagonally across the arena
        if (crossedBoundary) {
            player.teleported = true;
            startNewTrailSegment(player);
        }
        processPowerUpCollection(player, gameState);
    });

    // Run the collision engine loop
    Object.values(gameState.players).forEach(player => {
        if (!player.isAlive) return;

        if (checkTrailCollision(player, gameState.trails)) {
            eliminatePlayer(player.id);
        }
    });
}

export function getNextPlayerNumber() {
    const existingNumbers = Object.values(gameState.players).map(p => p.playerNumber);
    for (let i = 1; i <= 4; i++) {
        if (!existingNumbers.includes(i)) return i;
    }
    return 1;
}

export function startNewTrailSegment(player) {
    const segmentId = `${player.id}-${Date.now()}-${Math.random()}`;

    const newSegment = {
        id: segmentId,
        owner: player.id,
        x1: player.x,
        y1: player.y,
        x2: player.x,
        y2: player.y,
        color: player.color
    };

    gameState.trails.push(newSegment);
    player.currentTrailId = segmentId;
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

    if (winner) {
        winner.score = (winner.score ?? 0) + 1;
        if (winner.score >= gameState.winsRequired) {
            gameState.matchWinnerId = winner.id;
        }
    }

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
        roundNumber: gameState.roundNumber,
        durationMs: gameState.roundElapsedMs,
        winsRequired: gameState.winsRequired,
        isMatchOver: gameState.matchWinnerId !== null,
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

export function prepareNextRound() {
    if (gameState.gameStatus !== "GAME_OVER" || gameState.matchWinnerId) {
        return false;
    }

    // Clear round-only state while preserving each player's match score.
    gameState.roundNumber++;
    gameState.timer = 0;
    gameState.roundStartedAt = null;
    gameState.roundPausedAt = null;
    gameState.roundPausedDurationMs = 0;
    gameState.roundElapsedMs = 0;
    gameState.pausedBy = null;
    gameState.systemNotice = null;
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
        delete player.currentTrailId;
        delete player.eliminatedAt;
    });

    return true;
}

export function resetGameToLobby() {
    gameState.gameStatus = "LOBBY";
    gameState.timer = 0;
    gameState.roundStartedAt = null;
    gameState.roundPausedAt = null;
    gameState.roundPausedDurationMs = 0;
    gameState.roundElapsedMs = 0;
    gameState.pausedBy = null;
    gameState.systemNotice = null;
    gameState.roundResult = null;
    gameState.roundNumber = 1;
    gameState.matchWinnerId = null;
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
        delete player.currentTrailId;
        delete player.eliminatedAt;
    });
}
