import { playerNodes } from '../ui.js';
import {
    PLAYER_IMAGE_HEIGHT,
    PLAYER_IMAGE_WIDTH,
    PLAYER_OFFSET,
    PLAYER_SIZE,
    POWER_UP_ICONS
} from './renderConfig.js';

const arena = document.querySelector('#arena');
const playerElements = new Map();
const playerImages = new Map();

/**
 * Draws every cycle at an interpolated position between server updates.
 */
export function renderPlayers(previousState, currentState, progress) {
    const previousPlayers = previousState.players || {};
    const currentPlayers = currentState.players || {};
    const canInterpolate = previousState.gameStatus === 'PLAYING';

    cleanupPlayers(currentPlayers);

    Object.entries(currentPlayers).forEach(([id, player]) => {
        const previousPlayer = previousPlayers[id];
        const x = getInterpolatedCoordinate({
            canInterpolate,
            current: player.x,
            previous: previousPlayer?.x,
            progress,
            teleported: player.teleported
        }) - PLAYER_OFFSET;
        const y = getInterpolatedCoordinate({
            canInterpolate,
            current: player.y,
            previous: previousPlayer?.y,
            progress,
            teleported: player.teleported
        }) - PLAYER_OFFSET;

        const element = getOrCreatePlayerElement(id, player.color);
        const angle = getPlayerAngle(player);
        element.style.transform =
            `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`;
    });
}

/**
 * Reflects temporary server-side effects on cycles and scoreboard rows.
 */
export function updatePlayerStatusBars(players) {
    Object.entries(players).forEach(([id, player]) => {
        const item = playerNodes.get(id);
        if (!item) return;

        const statusContainer = item.querySelector(`#status-${id}`);
        const playerElement = getOrCreatePlayerElement(id, player.color);

        updateStatusIcon(
            statusContainer,
            `ghost-${id}`,
            POWER_UP_ICONS.GHOST,
            player.isGhost && player.ghostExpiresAt
        );
        playerElement.style.opacity =
            player.isGhost && player.ghostExpiresAt ? 0.4 : 1;

        updateStatusIcon(
            statusContainer,
            `freeze-${id}`,
            POWER_UP_ICONS.FREEZE,
            player.isFrozen && player.freezeExpiresAt
        );
        playerElement.style.filter =
            player.isFrozen && player.freezeExpiresAt
                ? 'brightness(1) sepia(1) hue-rotate(180deg)'
                : 'none';

        updateStatusIcon(
            statusContainer,
            `shield-${id}`,
            POWER_UP_ICONS.TRAIL_BREAKER,
            player.hasShield
        );
    });
}

export function cleanupAllPlayers() {
    playerElements.forEach((_, id) => removePlayerElement(id));
}

function getInterpolatedCoordinate({
    canInterpolate,
    current,
    previous,
    progress,
    teleported
}) {
    if (!canInterpolate || previous === undefined || teleported) {
        return current;
    }

    return lerp(previous, current, progress);
}

function getPlayerAngle(player) {
    if (player.dx < 0) return 90;
    if (player.dy > 0) return 0;
    if (player.dy < 0) return 180;
    return -90;
}

function getOrCreatePlayerElement(id, color) {
    if (playerElements.has(id)) return playerElements.get(id);

    const element = document.createElement('div');
    element.classList.add('player-vehicle');
    element.style.cssText = `
        position: absolute;
        width: ${PLAYER_SIZE}px;
        height: ${PLAYER_SIZE}px;
        will-change: transform;
        z-index: 2;
    `;

    arena.appendChild(element);
    playerElements.set(id, element);
    createPlayerImage(element, id, color);
    return element;
}

function createPlayerImage(parent, id, color) {
    const image = document.createElement('div');
    image.classList.add('player-image', getVehicleColorClass(color));
    image.style.cssText = `
        position: absolute;
        width: ${PLAYER_IMAGE_WIDTH}px;
        height: ${PLAYER_IMAGE_HEIGHT}px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transform-origin: center;
        will-change: transform;
        image-rendering: pixelated;
    `;

    parent.appendChild(image);
    playerImages.set(id, image);
}

function getVehicleColorClass(color) {
    const classes = {
        '#00d9ff': 'player-vehicle--blue',
        '#ff3f68': 'player-vehicle--red',
        '#29ff9a': 'player-vehicle--green',
        '#ffb000': 'player-vehicle--yellow'
    };

    return classes[color];
}

function updateStatusIcon(parent, iconId, iconText, active) {
    const existingIcon = parent.querySelector(`#${iconId}`);

    if (!active) {
        existingIcon?.remove();
        return;
    }

    if (existingIcon) return;

    const icon = document.createElement('span');
    icon.id = iconId;
    icon.className = 'status-icon';
    icon.textContent = iconText;
    parent.appendChild(icon);
}

function cleanupPlayers(currentPlayers) {
    playerElements.forEach((_, id) => {
        if (!currentPlayers[id]) removePlayerElement(id);
    });
}

function removePlayerElement(id) {
    playerElements.get(id)?.remove();
    playerElements.delete(id);
    playerImages.delete(id);
}

function lerp(start, end, progress) {
    return start + (end - start) * progress;
}
