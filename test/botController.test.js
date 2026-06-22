import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DIRECTIONS,
    getCandidateDirections,
    getCurrentDirection
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
