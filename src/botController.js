export const DIRECTIONS = Object.freeze({
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
});

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
