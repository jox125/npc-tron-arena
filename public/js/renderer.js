import { renderState } from './client/state.js';
import {
    cleanupAllPlayers,
    renderPlayers,
    updatePlayerStatusBars
} from './render/playerView.js';
import {
    cleanupTrails,
    renderTrails
} from './render/trailView.js';
import {
    cleanupPowerUps,
    renderPowerUps
} from './render/powerUpView.js';
import {
    cleanupIndicators,
    renderWrapIndicators
} from './render/wrapIndicatorView.js';
import { SERVER_TICK_MS } from './render/renderConfig.js';

/**
 * Coordinates the visual modules once per browser animation frame.
 *
 * The server updates at 30 FPS. Interpolation fills the visual gap between
 * those updates so movement still appears smooth on a 60 FPS display.
 */
function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const currentState = renderState.current;
    const previousState = renderState.previous;
    if (!currentState || !previousState) return;

    if (currentState.gameStatus !== 'PLAYING') {
        cleanupTrails();
        cleanupAllPlayers();
        cleanupIndicators();
        cleanupPowerUps();
        return;
    }

    const progress = Math.min(
        (now - renderState.lastUpdate) / SERVER_TICK_MS,
        1
    );

    renderPlayers(previousState, currentState, progress);
    renderTrails(previousState, currentState, progress);
    renderWrapIndicators(currentState);
    renderPowerUps(currentState);
    updatePlayerStatusBars(currentState.players);
}

export function startLoop() {
    requestAnimationFrame(gameLoop);
}
