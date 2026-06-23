import {ARENA_HEIGHT, ARENA_WIDTH} from "./gameEngine.js";

export const DIRECTIONS = Object.freeze({
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
});
const DANGER_SCAN_STEP = 4;
const TRAIL_COLLISION_BUFFER = 4;
const PLAYER_DANGER_BUFFER = 10;

export function getCurrentDirection(player) {
    if (
        !player ||
        !Number.isFinite(player.dx) ||
        !Number.isFinite(player.dy)
    ) {
        return null;
    }

    if (player.dx > 0 && player.dy === 0) return DIRECTIONS.RIGHT;
    if (player.dx < 0 && player.dy === 0) return DIRECTIONS.LEFT;
    if (player.dy > 0 && player.dx === 0) return DIRECTIONS.DOWN;
    if (player.dy < 0 && player.dx === 0) return DIRECTIONS.UP;

    return null;
}

export function getCandidateDirections(player) {
    const currentDirection = getCurrentDirection(player);

    if (!currentDirection) {
        return [];
    }
    const directions = Object.values(DIRECTIONS);
    const oppositeDirections = {
        [DIRECTIONS.LEFT]: DIRECTIONS.RIGHT,
        [DIRECTIONS.RIGHT]: DIRECTIONS.LEFT,
        [DIRECTIONS.UP]: DIRECTIONS.DOWN,
        [DIRECTIONS.DOWN]: DIRECTIONS.UP
    };

    return directions.filter(
        direction => direction !== oppositeDirections[currentDirection]
    );
}

export function simulateStep(position, direction, distance) {
    const result = {...position};

    switch (direction) {
        case DIRECTIONS.RIGHT:
            result.x = result.x + distance;
            if (result.x > ARENA_WIDTH) {
                result.x = result.x - ARENA_WIDTH;
            }
            break;
        case DIRECTIONS.LEFT:
            result.x = result.x - distance;
            if (result.x < 0) {
                result.x = result.x + ARENA_WIDTH;
            }
            break;
        case DIRECTIONS.DOWN:
            result.y = result.y + distance;
            if (result.y > ARENA_HEIGHT) {
                result.y = result.y - ARENA_HEIGHT;
            }
            break;
        case DIRECTIONS.UP:
            result.y = result.y - distance;
            if (result.y < 0) {
                result.y = result.y + ARENA_HEIGHT;
            }
            break;
    }
    return result;
}

export function distanceToDanger(player, direction, gameState, maxDistance) {

    let currentPosition = {
        x: player.x,
        y: player.y
    };

    let distance = 0;
    while (distance < maxDistance) {
        const stepDistance = Math.min(DANGER_SCAN_STEP, maxDistance - distance);
        distance += stepDistance;
        currentPosition = simulateStep(
            currentPosition,
            direction,
            stepDistance
        );

        if (pointHitsTrail(currentPosition, player, gameState.trails) ||
            pointHitsOtherPlayer(currentPosition, player, gameState.players)) {
            return distance;
        }
    }
    return maxDistance;
}

function pointHitsTrail(point, player, trails) {
    for (let i = 0; i < (trails || []).length; i++) {
        const segment = {...trails[i]};
        if (segment.id === player.currentTrailId) {
            continue;
        }
        const minX = Math.min(segment.x1, segment.x2) -
            TRAIL_COLLISION_BUFFER;
        const maxX = Math.max(segment.x1, segment.x2) +
            TRAIL_COLLISION_BUFFER;
        const minY = Math.min(segment.y1, segment.y2) -
            TRAIL_COLLISION_BUFFER;
        const maxY = Math.max(segment.y1, segment.y2) +
            TRAIL_COLLISION_BUFFER;

        if (pointInWrappedBox(point, minX, maxX, minY, maxY)) {
            return true;
        }

    }
    return false;
}

function pointHitsOtherPlayer(point, player, players) {
    const otherPlayers = Object.values(players || {});

    for (const otherPlayer of otherPlayers) {
        if (player.id === otherPlayer.id || otherPlayer.isAlive === false) {
            continue;
        }

        const distanceX = wrappedAxisDistance(
            point.x,
            otherPlayer.x,
            ARENA_WIDTH
        );
        const distanceY = wrappedAxisDistance(
            point.y,
            otherPlayer.y,
            ARENA_HEIGHT
        );

        if (Math.hypot(distanceX, distanceY) <= PLAYER_DANGER_BUFFER) {
            return true;
        }
    }
    return false;
}

function pointInWrappedBox(point, minX, maxX, minY, maxY) {
    const wrappedXValues = [
        point.x,
        point.x - ARENA_WIDTH,
        point.x + ARENA_WIDTH
    ];
    const wrappedYValues = [
        point.y,
        point.y - ARENA_HEIGHT,
        point.y + ARENA_HEIGHT
    ];

    return wrappedXValues.some(x =>
        x >= minX &&
        x <= maxX &&
        wrappedYValues.some(y => y >= minY && y <= maxY)
    );
}

function wrappedAxisDistance(first, second, arenaSize) {
    const directDistance = Math.abs(first - second);
    return Math.min(directDistance, arenaSize - directDistance);
}
