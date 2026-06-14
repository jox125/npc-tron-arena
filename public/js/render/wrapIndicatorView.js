import { ARENA_SIZE } from './renderConfig.js';

const INDICATOR_RANGE = 70;
const INDICATOR_LONG_SIDE = 120;
const INDICATOR_SHORT_SIDE = 25;

const arena = document.querySelector('#arena');
const wrapIndicators = new Map();

/**
 * Shows where a cycle near one edge will reappear on the opposite edge.
 */
export function renderWrapIndicators(gameState) {
    const players = gameState.players || {};

    Object.entries(players).forEach(([id, player]) => {
        const element = getOrCreateIndicator(id);
        const edge = getNearestEdge(player);
        const intensity = 1 - edge.distance / INDICATOR_RANGE;

        if (edge.distance > INDICATOR_RANGE) {
            element.style.opacity = 0;
            return;
        }

        const layout = getIndicatorLayout(edge.name, player);
        const color = hexToRgb(player.color);

        element.style.cssText = `
            width: ${layout.width}px;
            height: ${layout.height}px;
            left: ${layout.x}px;
            top: ${layout.y}px;
            opacity: ${intensity};
            background: ${getGradient(edge.name, color)};
        `;
    });

    cleanupIndicatorsForPlayers(players);
}

export function cleanupIndicators() {
    cleanupIndicatorsForPlayers({});
}

function getOrCreateIndicator(id) {
    if (wrapIndicators.has(id)) return wrapIndicators.get(id);

    const element = document.createElement('div');
    element.classList.add('wrap-indicator');
    arena.appendChild(element);
    wrapIndicators.set(id, element);
    return element;
}

function getNearestEdge(player) {
    const distances = {
        left: player.x,
        right: ARENA_SIZE - player.x,
        top: player.y,
        bottom: ARENA_SIZE - player.y
    };
    const name = Object.keys(distances)
        .reduce((nearest, edge) =>
            distances[edge] < distances[nearest] ? edge : nearest
        );

    return { name, distance: distances[name] };
}

function getIndicatorLayout(edge, player) {
    const centeredX = player.x - 50;
    const centeredY = player.y - 50;

    if (edge === 'left' || edge === 'right') {
        return {
            x: edge === 'left' ? ARENA_SIZE - INDICATOR_SHORT_SIDE : 0,
            y: centeredY,
            width: INDICATOR_SHORT_SIDE,
            height: INDICATOR_LONG_SIDE
        };
    }

    return {
        x: centeredX,
        y: edge === 'top' ? ARENA_SIZE - INDICATOR_SHORT_SIDE : 0,
        width: INDICATOR_LONG_SIDE,
        height: INDICATOR_SHORT_SIDE
    };
}

function getGradient(edge, color) {
    const directions = {
        left: 'to left',
        right: 'to right',
        top: 'to top',
        bottom: 'to bottom'
    };

    return `linear-gradient(${directions[edge]}, `
        + `rgba(${color}, 0.3), transparent)`;
}

function cleanupIndicatorsForPlayers(players) {
    wrapIndicators.forEach((element, id) => {
        if (players[id]) return;
        element.remove();
        wrapIndicators.delete(id);
    });
}

function hexToRgb(hex) {
    const value = parseInt(hex.replace('#', ''), 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;

    return `${red}, ${green}, ${blue}`;
}
