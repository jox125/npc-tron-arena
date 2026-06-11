import { startNewTrailSegment, ARENA_WIDTH, ARENA_HEIGHT } from './gameEngine.js';
import { emitPowerUpAudio } from './gameEvents.js';

const POWER_UP_TYPES = ['GHOST', 'FREEZE', 'TRAIL_ERASER', 'TRAIL_BREAKER'];
const POWER_UP_ACTIVATION_CUES = Object.freeze({
    GHOST: 'powerup_ghost_activate',
    FREEZE: 'powerup_freeze_activate',
    TRAIL_ERASER: 'powerup_trail_eraser_activate',
    TRAIL_BREAKER: 'powerup_trail_breaker_activate'
});

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
    while (!positionIsSafe && attempts < 100) {
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
        // Verify coordinate clearance away from solid trails
        if (positionIsSafe) {
            for (const segment of gameState.trails) {
                // Find the closest point on this line segment to our random safeX, safeY
                const minX = Math.min(segment.x1, segment.x2);
                const maxX = Math.max(segment.x1, segment.x2);
                const minY = Math.min(segment.y1, segment.y2);
                const maxY = Math.max(segment.y1, segment.y2);

                // Give the power-up a 30px buffer zone around trails so it doesn't clip them
                const buffer = 30;
                if (safeX >= minX - buffer && safeX <= maxX + buffer &&
                    safeY >= minY - buffer && safeY <= maxY + buffer) {
                    positionIsSafe = false;
                    break; // Fail item position, retry!
                }
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
    emitPowerUpAudio('powerup_appears', {
        powerUpId: newPowerUp.id,
        powerUpType: newPowerUp.type
    });
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
            emitPowerUpAudio(getActivationCue(item.type), {
                playerId: player.id,
                powerUpId: item.id,
                powerUpType: item.type
            });
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

function getActivationCue(type) {
    return POWER_UP_ACTIVATION_CUES[type];
}

/**
 * Clears expired modifiers and returns standard physics variables back to baseline values
 */
export function maintainPowerUpTimers(player, gameState) {
    const now = Date.now();

    if (player.isGhost && now > player.ghostExpiresAt) {
        player.isGhost = false;
        emitPowerUpAudio('powerup_ghost_deactivate', {
            playerId: player.id,
            powerUpType: 'GHOST'
        });
    }

    if (player.isFrozen && now > player.freezeExpiresAt) {
        player.isFrozen = false;
        // Restore standard baseline engine velocities (2px back to 4px)
        if (player.dx !== 0) player.dx = Math.sign(player.dx) * 4;
        if (player.dy !== 0) player.dy = Math.sign(player.dy) * 4;

        const hasActiveFreeze = Object.values(gameState.players)
            .some(other => other.isAlive && other.isFrozen);
        if (!hasActiveFreeze) {
            emitPowerUpAudio('powerup_freeze_deactivate', {
                powerUpType: 'FREEZE'
            });
        }
    }
}
