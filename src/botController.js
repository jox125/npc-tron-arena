import {ARENA_HEIGHT, ARENA_WIDTH} from "./gameEngine.js";

export const DIRECTIONS = Object.freeze({
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
});
const DANGER_SCAN_STEP = 4;

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
    const result = { ...position };

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

}