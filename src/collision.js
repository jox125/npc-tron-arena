/**
 * Checks if a live player has collided with any solid trail segments in the arena.
 * @param {Object} player - The individual player object to check
 * @param {Array} trails - The global array of all trail segments
 * @returns {boolean} True if a crash is detected, otherwise false
 */
export function checkTrailCollision(player, trails) {
    for (const segment of trails) {
        // 1. Skip checking against the segment actively growing out of the player's back
        if (segment.id === player.currentTrailId) continue;

        // 2. Turning Buffer: Prevent instant self-suicide on a turn
        if (segment.owner === player.id) {
            const distToStart = Math.hypot(player.x - segment.x1, player.y - segment.y1);
            const distToEnd = Math.hypot(player.x - segment.x2, player.y - segment.y2);

            // Skip checking if they turned within the last 16 pixels
            if (distToStart < 16 || distToEnd < 16) {
                continue;
            }
        }

        // 3. 2D Axis-Aligned Bounding Box Math
        const buffer = 4; // Bounding box tolerance thickness
        const minX = Math.min(segment.x1, segment.x2) - buffer;
        const maxX = Math.max(segment.x1, segment.x2) + buffer;
        const minY = Math.min(segment.y1, segment.y2) - buffer;
        const maxY = Math.max(segment.y1, segment.y2) + buffer;

        // Check if the player's vehicle coordinate is inside the rectangle boundaries
        if (player.x >= minX && player.x <= maxX && player.y >= minY && player.y <= maxY) {
            return true; // Crash detected
        }
    }

    return false; // Safe
}