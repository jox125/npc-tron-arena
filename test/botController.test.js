import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DIRECTIONS,
    chooseBotDirection,
    distanceToDanger,
    distanceToNearestOpponent,
    distanceToNearestPowerUp,
    getCandidateDirections,
    getCurrentDirection,
    scoreDirection,
    shouldBotDecide,
    simulateStep,
    updateBots
} from "../src/botController.js";
import {
    BOT_DIFFICULTIES,
    BOT_PERSONALITIES
} from "../src/botConfig.js";

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

test('distanceToNearestPowerUp ignores power-up when human is twice as close', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    });
    const human = createPlayer({
        id: 'human',
        x: 119,
        y: 100
    });
    const gameState = createGameState({
        players: [player, human],
        trails: [],
        powerUps: [
            createPowerUp({
                id: 'contested-powerup',
                x: 124,
                y: 100,
                radius: 15
            })
        ]
    });

    assert.equal(
        distanceToNearestPowerUp(player, DIRECTIONS.RIGHT, gameState, 40),
        40
    );
});

test('distanceToNearestPowerUp ignores power-up when another bot is twice as close', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    });
    const otherBot = createBotPlayer({
        id: 'other-bot',
        x: 119,
        y: 100,
        dx: 4,
        dy: 0
    });
    const gameState = createGameState({
        players: [player, otherBot],
        trails: [],
        powerUps: [
            createPowerUp({
                id: 'contested-powerup',
                x: 124,
                y: 100,
                radius: 15
            })
        ]
    });

    assert.equal(
        distanceToNearestPowerUp(player, DIRECTIONS.RIGHT, gameState, 40),
        40
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

test('scoreDirection keeps safety more important than nearby rewards', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        personality: BOT_PERSONALITIES.COLLECTOR
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'wall',
                x1: 116,
                y1: 96,
                x2: 116,
                y2: 104
            })
        ],
        powerUps: [
            createPowerUp({
                id: 'bait',
                x: 108,
                y: 100,
                radius: 15
            })
        ]
    });

    const unsafeScore = scoreDirection(
        player,
        DIRECTIONS.RIGHT,
        gameState,
        deterministicOptions()
    );
    const safeScore = scoreDirection(
        player,
        DIRECTIONS.DOWN,
        gameState,
        deterministicOptions()
    );

    assert.ok(safeScore.score > unsafeScore.score);
});

test('hunter prefers an otherwise safe direction toward an opponent', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        personality: BOT_PERSONALITIES.HUNTER
    });
    const opponent = createPlayer({
        id: 'opponent',
        x: 100,
        y: 40
    });
    const gameState = createGameState({
        players: [player, opponent],
        trails: []
    });

    const decision = chooseBotDirection(
        player,
        gameState,
        1000,
        deterministicOptions()
    );

    assert.equal(decision.direction, DIRECTIONS.UP);
});

test('collector prefers an otherwise safe direction toward a power-up', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        personality: BOT_PERSONALITIES.COLLECTOR
    });
    const gameState = createGameState({
        players: [player],
        trails: [],
        powerUps: [
            createPowerUp({
                id: 'powerup',
                x: 100,
                y: 124,
                radius: 15
            })
        ]
    });

    const decision = chooseBotDirection(
        player,
        gameState,
        1000,
        deterministicOptions()
    );

    assert.equal(decision.direction, DIRECTIONS.DOWN);
});

test('bot decision waits for nextDecisionAt when no immediate danger exists', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        botRuntime: {
            nextDecisionAt: 2000
        }
    });
    const gameState = createGameState({
        players: [player],
        trails: []
    });

    assert.deepEqual(
        shouldBotDecide(player, gameState, 1000, deterministicOptions()),
        {
            shouldDecide: false,
            reason: 'WAIT',
            dangerDistance: 120
        }
    );
    assert.equal(
        chooseBotDirection(player, gameState, 1000, deterministicOptions()),
        null
    );
});

test('bot decision ignores nextDecisionAt when danger is close', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        botRuntime: {
            nextDecisionAt: 2000
        }
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'wall',
                x1: 116,
                y1: 96,
                x2: 116,
                y2: 104
            })
        ]
    });

    const readiness = shouldBotDecide(
        player,
        gameState,
        1000,
        deterministicOptions()
    );
    const decision = chooseBotDirection(
        player,
        gameState,
        1000,
        deterministicOptions()
    );

    assert.equal(readiness.shouldDecide, true);
    assert.equal(readiness.reason, 'DANGER');
    assert.notEqual(decision.direction, DIRECTIONS.RIGHT);
});

test('bot decision respects turn interval for non-panic danger', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        botRuntime: {
            lastTurnAt: 900,
            nextDecisionAt: 2000
        }
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'near-wall',
                x1: 116,
                y1: 96,
                x2: 116,
                y2: 104
            })
        ]
    });

    const readiness = shouldBotDecide(
        player,
        gameState,
        1000,
        deterministicOptions()
    );

    assert.deepEqual(readiness, {
        shouldDecide: false,
        reason: 'TURN_COOLDOWN',
        dangerDistance: 12
    });
    assert.equal(
        chooseBotDirection(player, gameState, 1000, deterministicOptions()),
        null
    );
});

test('bot decision can panic-turn inside critical danger distance', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        botRuntime: {
            lastTurnAt: 900,
            nextDecisionAt: 2000
        }
    });
    const gameState = createGameState({
        players: [player],
        trails: [
            createTrail({
                id: 'panic-wall',
                x1: 108,
                y1: 96,
                x2: 108,
                y2: 104
            })
        ]
    });

    const readiness = shouldBotDecide(
        player,
        gameState,
        1000,
        deterministicOptions()
    );
    const decision = chooseBotDirection(
        player,
        gameState,
        1000,
        deterministicOptions()
    );

    assert.equal(readiness.shouldDecide, true);
    assert.equal(readiness.reason, 'DANGER');
    assert.notEqual(decision.direction, DIRECTIONS.RIGHT);
});

test('hard reacts to farther danger than easy', () => {
    const easyBot = createBotPlayer({
        id: 'easy-bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        difficulty: BOT_DIFFICULTIES.EASY,
        botRuntime: {
            nextDecisionAt: 2000
        }
    });
    const hardBot = createBotPlayer({
        id: 'hard-bot',
        x: 100,
        y: 140,
        dx: 4,
        dy: 0,
        difficulty: BOT_DIFFICULTIES.HARD,
        botRuntime: {
            nextDecisionAt: 2000
        }
    });
    const easyGameState = createGameState({
        players: [easyBot],
        trails: [
            createTrail({
                id: 'easy-wall',
                x1: 140,
                y1: 96,
                x2: 140,
                y2: 104
            })
        ]
    });
    const hardGameState = createGameState({
        players: [hardBot],
        trails: [
            createTrail({
                id: 'hard-wall',
                x1: 140,
                y1: 136,
                x2: 140,
                y2: 144
            })
        ]
    });

    assert.equal(
        shouldBotDecide(easyBot, easyGameState, 1000).reason,
        'WAIT'
    );
    assert.equal(
        shouldBotDecide(hardBot, hardGameState, 1000).reason,
        'DANGER'
    );
});

test('chooseBotDirection updates botRuntime scheduling fields', () => {
    const player = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    });
    const gameState = createGameState({
        players: [player],
        trails: []
    });

    const decision = chooseBotDirection(
        player,
        gameState,
        1000,
        deterministicOptions()
    );

    assert.equal(decision.reason, 'STRATEGY');
    assert.equal(player.botRuntime.nextDecisionAt, 1950);
    assert.equal(player.botRuntime.forceDecisionAt, 4800);
    assert.equal(player.botRuntime.lastDirection, decision.direction);
});

test('updateBots skips all decisions outside active play', () => {
    const bot = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    });
    const gameState = createGameState({
        players: [bot],
        trails: [],
        gameStatus: 'LOBBY'
    });
    const turnCalls = [];

    const decisions = updateBots(gameState, 1000, {
        decisionOptions: deterministicOptions(),
        turnPlayer: (player, direction) => {
            turnCalls.push({player, direction});
            return true;
        }
    });

    assert.deepEqual(decisions, []);
    assert.deepEqual(turnCalls, []);
});

test('updateBots only processes alive bot players', () => {
    const human = createPlayer({
        id: 'human',
        x: 100,
        y: 100
    });
    human.dx = 4;
    human.dy = 0;
    const deadBot = createBotPlayer({
        id: 'dead-bot',
        x: 100,
        y: 140,
        dx: 4,
        dy: 0,
        isAlive: false
    });
    const aliveBot = createBotPlayer({
        id: 'alive-bot',
        x: 100,
        y: 180,
        dx: 4,
        dy: 0
    });
    const gameState = createGameState({
        players: [human, deadBot, aliveBot],
        trails: [],
        gameStatus: 'PLAYING'
    });
    const turnCalls = [];

    const decisions = updateBots(gameState, 1000, {
        decisionOptions: deterministicOptions(),
        turnPlayer: (player, direction) => {
            turnCalls.push({playerId: player.id, direction});
            return true;
        }
    });

    assert.equal(decisions.length, 1);
    assert.deepEqual(turnCalls, [
        {
            playerId: 'alive-bot',
            direction: decisions[0].direction
        }
    ]);
});

test('updateBots waits when nextDecisionAt has not arrived', () => {
    const bot = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        botRuntime: {
            nextDecisionAt: 2000
        }
    });
    const gameState = createGameState({
        players: [bot],
        trails: [],
        gameStatus: 'PLAYING'
    });
    const turnCalls = [];

    const decisions = updateBots(gameState, 1000, {
        decisionOptions: deterministicOptions(),
        turnPlayer: (player, direction) => {
            turnCalls.push({player, direction});
            return true;
        }
    });

    assert.deepEqual(decisions, []);
    assert.deepEqual(turnCalls, []);
});

test('updateBots reacts to immediate danger even before nextDecisionAt', () => {
    const bot = createBotPlayer({
        id: 'bot',
        x: 100,
        y: 100,
        dx: 4,
        dy: 0,
        botRuntime: {
            nextDecisionAt: 2000
        }
    });
    const gameState = createGameState({
        players: [bot],
        trails: [
            createTrail({
                id: 'wall',
                x1: 116,
                y1: 96,
                x2: 116,
                y2: 104
            })
        ],
        gameStatus: 'PLAYING'
    });
    const turnCalls = [];

    const decisions = updateBots(gameState, 1000, {
        decisionOptions: deterministicOptions(),
        turnPlayer: (player, direction) => {
            turnCalls.push({playerId: player.id, direction});
            return true;
        }
    });

    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].reason, 'DANGER');
    assert.notEqual(decisions[0].direction, DIRECTIONS.RIGHT);
    assert.deepEqual(turnCalls, [
        {
            playerId: 'bot',
            direction: decisions[0].direction
        }
    ]);
});

function createGameState({
    players,
    trails,
    powerUps = [],
    gameStatus = 'PLAYING'
}) {
    return {
        gameStatus,
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

function createBotPlayer({
    id,
    x,
    y,
    dx,
    dy,
    botRuntime,
    isAlive = true,
    personality = BOT_PERSONALITIES.SURVIVOR,
    difficulty = BOT_DIFFICULTIES.EASY
}) {
    return {
        ...createPlayer({
            id,
            x,
            y
        }),
        dx,
        dy,
        botRuntime,
        difficulty,
        isAlive,
        isBot: true,
        personality
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

function deterministicOptions() {
    return {
        lookAhead: 120,
        random: () => 0.5
    };
}
