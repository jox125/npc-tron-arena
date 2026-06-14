import {
    TRAIL_OFFSET,
    TRAIL_THICKNESS
} from './renderConfig.js';

const arena = document.querySelector('#arena');
const trailElements = new Map();

/**
 * Expands DOM rectangles to match the server's axis-aligned trail segments.
 */
export function renderTrails(previousState, currentState, progress) {
    const currentTrails = currentState.trails || [];
    const previousTrails = new Map(
        (previousState.trails || []).map(segment => [segment.id, segment])
    );

    currentTrails.forEach(segment => {
        const element = getOrCreateTrailElement(segment);
        const previousSegment = previousTrails.get(segment.id) || segment;

        const x1 = lerp(previousSegment.x1, segment.x1, progress);
        const y1 = lerp(previousSegment.y1, segment.y1, progress);
        const x2 = lerp(previousSegment.x2, segment.x2, progress);
        const y2 = lerp(previousSegment.y2, segment.y2, progress);

        const x = Math.min(x1, x2) - TRAIL_OFFSET;
        const y = Math.min(y1, y2) - TRAIL_OFFSET;
        const width = Math.abs(x2 - x1) + TRAIL_THICKNESS;
        const height = Math.abs(y2 - y1) + TRAIL_THICKNESS;

        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
    });

    cleanupTrails(currentTrails);
}

export function cleanupTrails(currentTrails = []) {
    const activeIds = new Set(currentTrails.map(trail => trail.id));

    trailElements.forEach((element, id) => {
        if (activeIds.has(id)) return;
        element.remove();
        trailElements.delete(id);
    });
}

function getOrCreateTrailElement(segment) {
    if (trailElements.has(segment.id)) {
        return trailElements.get(segment.id);
    }

    const element = document.createElement('div');
    element.classList.add('trail-segment');
    element.style.cssText = `
        position: absolute;
        background-color: ${segment.color};
        box-shadow:
            0 0 4px ${segment.color},
            0 0 16px ${segment.color};
        will-change: transform;
        z-index: 1;
    `;

    arena.appendChild(element);
    trailElements.set(segment.id, element);
    return element;
}

function lerp(start, end, progress) {
    return start + (end - start) * progress;
}
