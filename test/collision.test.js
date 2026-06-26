import test from 'node:test';
import assert from 'node:assert/strict';

import { checkTrailCollision } from '../src/collision.js';

test('own trail does not collide while leaving the latest segment end', () => {
    const player = createCollisionPlayer({
        x: 100,
        y: 104,
        dx: 0,
        dy: 4
    });
    const trails = [
        createTrail({
            x1: 20,
            y1: 100,
            x2: 100,
            y2: 100
        })
    ];

    assert.equal(checkTrailCollision(player, trails), false);
});

test('own trail collides when turning back through a nearby segment end', () => {
    const player = createCollisionPlayer({
        x: 96,
        y: 100,
        dx: 0,
        dy: -4
    });
    const trails = [
        createTrail({
            x1: 20,
            y1: 100,
            x2: 100,
            y2: 100
        })
    ];

    assert.equal(checkTrailCollision(player, trails), true);
});

test('own trail collides when approaching the latest segment end', () => {
    const player = createCollisionPlayer({
        x: 100,
        y: 104,
        dx: 0,
        dy: -4
    });
    const trails = [
        createTrail({
            x1: 20,
            y1: 100,
            x2: 100,
            y2: 100
        })
    ];

    assert.equal(checkTrailCollision(player, trails), true);
});

function createCollisionPlayer(overrides = {}) {
    return {
        id: 'player-1',
        x: 100,
        y: 100,
        dx: 0,
        dy: 4,
        isGhost: false,
        hasShield: false,
        currentTrailId: 'current-trail',
        ...overrides
    };
}

function createTrail(overrides = {}) {
    return {
        id: 'old-trail',
        owner: 'player-1',
        x1: 20,
        y1: 100,
        x2: 100,
        y2: 100,
        color: '#00ffff',
        ...overrides
    };
}
