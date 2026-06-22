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