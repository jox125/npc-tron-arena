import { startNewTrailSegment, ARENA_WIDTH, ARENA_HEIGHT } from './gameEngine.js';

const POWER_UP_TYPES = ['GHOST', 'FREEZE', 'TRAIL_ERASER', 'TRAIL_BREAKER'];

/**
 * Authoritatively spawns a random power-up entity away from bikes and trails
 */
export function spawnRandomPowerUp(gameState) {
    // Cap total concurrent active power-ups at 3 to avoid cluttering the grid
    if (gameState.powerUps.length >= 3 || gameState.gameStatus !== "PLAYING") return;

    let safeX = 0;
    let safeY = 0;
    let attempts = 0;
    let positionIsSafe = false;

    // Retry loop to find a clear coordinate segment
    while (!positionIsSafe && attempts < 50) {
        attempts++;
        // Maintain a 50px safety padding boundary away from the outer edges
        safeX = Math.floor(Math.random() * (ARENA_WIDTH - 100)) + 50;
        safeY = Math.floor(Math.random() * (ARENA_HEIGHT - 100)) + 50;

        positionIsSafe = true;

        // Verify coordinate clearance: ensure it's at least 60px away from any living player
        for (const player of Object.values(gameState.players)) {
            if (player.isAlive && Math.hypot(player.x - safeX, player.y - safeY) < 60) {
                positionIsSafe = false;
                break;
            }
        }
    }

    if (!positionIsSafe) return; // Abort this interval tick if arena is too cramped

    const newPowerUp = {
        id: `powerup-${Date.now()}-${Math.random()}`,
        type: POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)],
        x: safeX,
        y: safeY,
        radius: 15
    };

    gameState.powerUps.push(newPowerUp);
}

/**
 * Checks if a player crossed paths with a floating power-up circle
 */
export function processPowerUpCollection(player, gameState) {
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const item = gameState.powerUps[i];

        // Circular bounding radius collision check (Bike size + item size)
        const distance = Math.hypot(player.x - item.x, player.y - item.y);
        if (distance < (5 + item.radius)) {

            // Remove the item from the map instance array
            gameState.powerUps.splice(i, 1);

            // Apply the custom functional physics overrides
            applyPowerUpEffect(player, item.type, gameState);
            break;
        }
    }
}

function applyPowerUpEffect(player, type, gameState) {
    const timestamp = Date.now();

    switch (type) {
        case 'GHOST':
            // 1. Ghost: Temporarily toggle collision check to false for 4 seconds
            player.isGhost = true;
            player.ghostExpiresAt = timestamp + 4000;
            break;

        case 'FREEZE':
            // 2. Freeze: Cut velocity modifiers in half for all other active connection IDs for 5 seconds
            Object.values(gameState.players).forEach(other => {
                if (other.id !== player.id && other.isAlive) {
                    other.isFrozen = true;
                    other.freezeExpiresAt = timestamp + 5000;

                    // Instantly scale down active directional vector speeds (4px down to 2px)
                    if (other.dx !== 0) other.dx = Math.sign(other.dx) * 2;
                    if (other.dy !== 0) other.dy = Math.sign(other.dy) * 2;
                }
            });
            break;

        case 'TRAIL_ERASER':
            // 3. Trail Eraser: Clear out the player's historical trail coordinates from the master array
            // Keep their current active line, but drop all completed historical segments
            gameState.trails = gameState.trails.filter(t => t.owner !== player.id || t.id === player.currentTrailId);
            break;

        case 'TRAIL_BREAKER':
            // 4. Trail Breaker: Set a permanent boolean shield flag; drops upon intersection
            player.hasShield = true;
            break;
    }
}

/**
 * Clears expired modifiers and returns standard physics variables back to baseline values
 */
export function maintainPowerUpTimers(player) {
    const now = Date.now();

    if (player.isGhost && now > player.ghostExpiresAt) {
        player.isGhost = false;
    }

    if (player.isFrozen && now > player.freezeExpiresAt) {
        player.isFrozen = false;
        // Restore standard baseline engine velocities (2px back to 4px)
        if (player.dx !== 0) player.dx = Math.sign(player.dx) * 4;
        if (player.dy !== 0) player.dy = Math.sign(player.dy) * 4;
    }
}