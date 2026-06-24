import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DIRECTIONS,
    distanceToDanger,
    distanceToNearestOpponent,
    distanceToNearestPowerUp,
    getCandidateDirections,
    getCurrentDirection,
    simulateStep
} from "../src/botController.js";

test('invalid player input returns null', () => {
    const invalidInputs = [
        null,
        undefined,
        {},
        {dx: 4},
        {dy: 4},
        {dx: 'left 4', dy: 0},
        {dx: 0, dy: 'up'},
        {dx: NaN, dy: 0},
        {dx: 0, dy: NaN},
        {dx: Infinity, dy: 0},
        {dx: 0, dy: -Infinity}
    ];

    invalidInputs.forEach(player => {
        assert.equal(getCurrentDirection(player), null);
    });
});

test('stationary and diagonal movement return null', () => {
    const invalidVelocities = [
        {dx: 0, dy: 0},
        {dx: 3, dy: 4},
        {dx: 3, dy: -4},
        {dx: -3, dy: 4},
        {dx: -3, dy: -4}
    ];

    invalidVelocities.forEach(player => {
        assert.equal(getCurrentDirection(player), null);
    });
});

test('axis-aligned movement returns current direction', () => {
    const validVelocities = [
        {dx: 4, dy: 0, direction: DIRECTIONS.RIGHT},
        {dx: 2, dy: 0, direction: DIRECTIONS.RIGHT},
        {dx: -4, dy: 0, direction: DIRECTIONS.LEFT},
        {dx: -2, dy: 0, direction: DIRECTIONS.LEFT},
        {dx: 0, dy: 4, direction: DIRECTIONS.DOWN},
        {dx: 0, dy: 2, direction: DIRECTIONS.DOWN},
        {dx: 0, dy: -4, direction: DIRECTIONS.UP},
        {dx: 0, dy: -2, direction: DIRECTIONS.UP}
    ];

    validVelocities.forEach(({dx, dy, direction}) => {
        assert.equal(getCurrentDirection({dx, dy}), direction);
    });
});

test('candidate directions return forward, left and right without reverse', () => {
    const candidatesByVelocity = [
        {
            player: {dx: 4, dy: 0},
            expected: [
                DIRECTIONS.UP,
                DIRECTIONS.DOWN,
                DIRECTIONS.RIGHT
            ]
        },
        {
            player: {dx: -4, dy: 0},
            expected: [
                DIRECTIONS.UP,
                DIRECTIONS.DOWN,
                DIRECTIONS.LEFT
            ]
        },
        {
            player: {dx: 0, dy: 4},
            expected: [
                DIRECTIONS.DOWN,
                DIRECTIONS.LEFT,
                DIRECTIONS.RIGHT
            ]
        },
        {
            player: {dx: 0, dy: -4},
            expected: [
                DIRECTIONS.UP,
                DIRECTIONS.LEFT,
                DIRECTIONS.RIGHT
            ]
        }
    ];

    candidatesByVelocity.forEach(({player, expected}) => {
        assert.deepEqual(
            [...getCandidateDirections(player)].sort(),
            [...expected].sort()
        );
    });
});

test('candidate directions return empty array when current direction is invalid', () => {
    const invalidPlayers = [
        null,
        {dx: 0, dy: 0},
        {dx: 3, dy: 4},
        {dx: NaN, dy: 0}
    ];

    invalidPlayers.forEach(player => {
        assert.deepEqual(getCandidateDirections(player), []);
    });
});

test('simulateStep moves position in the requested direction', () => {
    const cases = [
        {
            direction: DIRECTIONS.RIGHT,
            expected: {x: 108, y: 100}
        },
        {
            direction: DIRECTIONS.LEFT,
            expected: {x: 92, y: 100}
        },
        {
            direction: DIRECTIONS.DOWN,
            expected: {x: 100, y: 108}
        },
        {
            direction: DIRECTIONS.UP,
            expected: {x: 100, y: 92}
        }
    ];

    cases.forEach(({direction, expected}) => {
        assert.deepEqual(
            simulateStep({x: 100, y: 100}, direction, 8),
            expected
        );
    });
});

test('simulateStep wraps across arena edges', () => {
    const cases = [
        {
            position: {x: 798, y: 100},
            direction: DIRECTIONS.RIGHT,
            expected: {x: 6, y: 100}
        },
        {
            position: {x: 2, y: 100},
            direction: DIRECTIONS.LEFT,
            expected: {x: 794, y: 100}
        },
        {
            position: {x: 100, y: 798},
            direction: DIRECTIONS.DOWN,
            expected: {x: 100, y: 6}
        },
        {
            position: {x: 100, y: 2},
            direction: DIRECTIONS.UP,
            expected: {x: 100, y: 794}
        }
    ];

    cases.forEach(({position, direction, expected}) => {
        assert.deepEqual(simulateStep(position, direction, 8), expected);
    });
});

test('simulateStep does not mutate the original position', () => {
    const position = {x: 798, y: 100};

    const result = simulateStep(position, DIRECTIONS.RIGHT, 8);

    assert.deepEqual(position, {x: 798, y: 100});
    assert.notEqual(result, position);
});

test('distanceToDanger returns max distance when no danger is found', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: []
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        40
    );
});

test('distanceToDanger detects trail danger with collision buffer', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'trail-danger',
                x1: 120,
                y1: 96,
                x2: 120,
                y2: 104
            })
        ]
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        16
    );
});

test('distanceToDanger ignores player active trail segment', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        currentTrailId: 'active-trail'
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'active-trail',
                x1: 104,
                y1: 96,
                x2: 104,
                y2: 104
            })
        ]
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        40
    );
});

test('distanceToDanger detects nearby other player', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const opponent = createPlayer({
        id: 'opponent',
        x: 116,
        y: 100
    });
    const gameState = createGameState({
        players: [player, opponent],
        trails: []
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        8
    );
});

test('distanceToDanger ignores self and eliminated players', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const eliminatedOpponent = createPlayer({
        id: 'opponent',
        x: 108,
        y: 100,
        isAlive: false
    });
    const gameState = createGameState({
        players: [player, eliminatedOpponent],
        trails: []
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        40
    );
});

test('distanceToDanger detects trail danger across arena wrap', () => {
    const player = createPlayer({
        id: 'bot',
        x: 790,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'wrapped-trail',
                x1: 2,
                y1: 96,
                x2: 2,
                y2: 104
            })
        ]
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        8
    );
});

test('distanceToDanger detects nearby player across arena wrap', () => {
    const player = createPlayer({
        id: 'bot',
        x: 790,
        y: 100
    });
    const opponent = createPlayer({
        id: 'opponent',
        x: 2,
        y: 100
    });
    const gameState = createGameState({
        players: [player, opponent],
        trails: []
    });

    assert.equal(
        distanceToDanger(player, DIRECTIONS.RIGHT, gameState, 40),
        4
    );
});

test('distanceToNearestPowerUp returns max distance when no power-up is found', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: [],
        powerUps: []
    });

    assert.equal(
        distanceToNearestPowerUp(player, DIRECTIONS.RIGHT, gameState, 40),
        40
    );
});

test('distanceToNearestPowerUp detects collectible power-up radius', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: [],
        powerUps: [
            createPowerUp({
                id: 'powerup-1',
                x: 124,
                y: 100,
                radius: 15
            })
        ]
    });

    assert.equal(
        distanceToNearestPowerUp(player, DIRECTIONS.RIGHT, gameState, 40),
        8
    );
});

test('distanceToNearestPowerUp detects power-up across arena wrap', () => {
    const player = createPlayer({
        id: 'bot',
        x: 790,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: [],
        powerUps: [
            createPowerUp({
                id: 'powerup-1',
                x: 5,
                y: 100,
                radius: 15
            })
        ]
    });

    assert.equal(
        distanceToNearestPowerUp(player, DIRECTIONS.RIGHT, gameState, 40),
        4
    );
});

test('distanceToNearestOpponent returns max distance when no opponent is found', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const gameState = createGameState({
        players: [player],
        trails: []
    });

    assert.equal(
        distanceToNearestOpponent(player, DIRECTIONS.RIGHT, gameState, 40),
        40
    );
});

test('distanceToNearestOpponent detects opponent within scan radius', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const opponent = createPlayer({
        id: 'opponent',
        x: 164,
        y: 100
    });
    const gameState = createGameState({
        players: [player, opponent],
        trails: []
    });

    assert.equal(
        distanceToNearestOpponent(player, DIRECTIONS.RIGHT, gameState, 80),
        4
    );
});

test('distanceToNearestOpponent ignores self and eliminated players', () => {
    const player = createPlayer({
        id: 'bot',
        x: 100,
        y: 100
    });
    const eliminatedOpponent = createPlayer({
        id: 'opponent',
        x: 140,
        y: 100,
        isAlive: false
    });
    const gameState = createGameState({
        players: [player, eliminatedOpponent],
        trails: []
    });

    assert.equal(
        distanceToNearestOpponent(player, DIRECTIONS.RIGHT, gameState, 80),
        80
    );
});

test('distanceToNearestOpponent detects opponent across arena wrap', () => {
    const player = createPlayer({
        id: 'bot',
        x: 760,
        y: 100
    });
    const opponent = createPlayer({
        id: 'opponent',
        x: 20,
        y: 100
    });
    const gameState = createGameState({
        players: [player, opponent],
        trails: []
    });

    assert.equal(
        distanceToNearestOpponent(player, DIRECTIONS.RIGHT, gameState, 80),
        4
    );
});

function createGameState({players, trails, powerUps = []}) {
    return {
        players: Object.fromEntries(
            players.map(player => [player.id, player])
        ),
        trails,
        powerUps
    };
}

function createPlayer({
    id,
    x,
    y,
    currentTrailId,
    isAlive = true
}) {
    return {
        id,
        x,
        y,
        currentTrailId,
        isAlive
    };
}

function createTrail({id, x1, y1, x2, y2}) {
    return {
        id,
        x1,
        y1,
        x2,
        y2
    };
}

function createPowerUp({id, x, y, radius}) {
    return {
        id,
        x,
        y,
        radius
    };
}
