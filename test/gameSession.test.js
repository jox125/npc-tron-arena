import test from 'node:test';
import assert from 'node:assert/strict';

import {
    eliminatePlayer,
    gameState,
    prepareNextRound,
    resetGameToLobby,
    resetRoomToLobby
} from '../src/gameEngine.js';
import { GAME_MODES } from '../src/server/gameModes.js';
import { createGameSession } from '../src/server/gameSession.js';

test('single-player round ends when the human dies', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.gameStatus = 'PLAYING';
    gameState.players.host = createHumanPlayer('host', {
        playerNumber: 1
    });
    gameState.players['bot-2'] = createBotPlayer('bot-2', {
        playerNumber: 2,
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    });
    gameState.players['bot-3'] = createBotPlayer('bot-3', {
        playerNumber: 3,
        x: 100,
        y: 200,
        dx: 4,
        dy: 0
    });
    gameState.trails = [
        createTrail({
            id: 'danger-near-bot-2',
            x1: 120,
            y1: 96,
            x2: 120,
            y2: 104
        })
    ];
    const session = createTestSession();

    eliminatePlayer('host');
    const ended = session.resolveRoundEnd();

    assert.equal(ended, true);
    assert.equal(gameState.gameStatus, 'GAME_OVER');
    assert.equal(gameState.roundResult.winnerId, 'bot-3');
    assert.equal(gameState.players['bot-3'].score, 1);
    assert.equal(gameState.roundResult.rankings[0].id, 'bot-3');
});

test('single-player bot winner tie uses lower player number', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.gameStatus = 'PLAYING';
    gameState.players.host = createHumanPlayer('host', {
        playerNumber: 1
    });
    gameState.players['bot-2'] = createBotPlayer('bot-2', {
        playerNumber: 2,
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    });
    gameState.players['bot-3'] = createBotPlayer('bot-3', {
        playerNumber: 3,
        x: 100,
        y: 200,
        dx: 4,
        dy: 0
    });
    const session = createTestSession();

    eliminatePlayer('host');
    const ended = session.resolveRoundEnd();

    assert.equal(ended, true);
    assert.equal(gameState.roundResult.winnerId, 'bot-2');
});

test('multiplayer still waits while multiple players are alive', () => {
    resetState();
    gameState.gameMode = GAME_MODES.MULTIPLAYER;
    gameState.gameStatus = 'PLAYING';
    gameState.players.host = createHumanPlayer('host', {
        playerNumber: 1
    });
    gameState.players.guest = createHumanPlayer('guest', {
        playerNumber: 2
    });
    gameState.players.third = createHumanPlayer('third', {
        playerNumber: 3
    });
    const session = createTestSession();

    eliminatePlayer('host');
    const ended = session.resolveRoundEnd();

    assert.equal(ended, false);
    assert.equal(gameState.gameStatus, 'PLAYING');
    assert.equal(gameState.roundResult, null);
});

test('final match summary auto-returns to lobby after timeout', (context) => {
    resetState();
    context.mock.timers.enable({
        apis: ['Date', 'setTimeout'],
        now: 1000
    });
    gameState.gameMode = GAME_MODES.MULTIPLAYER;
    gameState.gameStatus = 'PLAYING';
    gameState.winsRequired = 1;
    gameState.players.host = createHumanPlayer('host', {
        playerNumber: 1
    });
    gameState.players.guest = createHumanPlayer('guest', {
        playerNumber: 2
    });
    const io = createFakeIo();
    const session = createGameSession(io, {
        matchSummaryAutoReturnMs: 30
    });

    eliminatePlayer('guest');
    const ended = session.resolveRoundEnd();

    assert.equal(ended, true);
    assert.equal(gameState.gameStatus, 'GAME_OVER');
    assert.equal(gameState.matchWinnerId, 'host');
    assert.equal(gameState.resultAutoReturnAt, 1030);

    context.mock.timers.tick(29);

    assert.equal(gameState.gameStatus, 'GAME_OVER');

    context.mock.timers.tick(1);

    assert.equal(gameState.gameStatus, 'LOBBY');
    assert.deepEqual(gameState.players, {});
    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(gameState.winsRequired, 3);
    assert.deepEqual(gameState.botConfigs, []);
    assert.equal(gameState.matchWinnerId, null);
    assert.equal(gameState.roundResult, null);
    assert.equal(gameState.resultAutoReturnAt, null);
    assert.equal(io.emitted('ROOM_STATE_UPDATE').length, 1);
    assert.equal(io.emitted('GAME_STATE_UPDATE').length, 1);
});

test('non-final round summary auto-returns to lobby after timeout', (context) => {
    resetState();
    context.mock.timers.enable({
        apis: ['Date', 'setTimeout'],
        now: 1000
    });
    gameState.gameMode = GAME_MODES.MULTIPLAYER;
    gameState.gameStatus = 'PLAYING';
    gameState.winsRequired = 2;
    gameState.players.host = createHumanPlayer('host', {
        playerNumber: 1
    });
    gameState.players.guest = createHumanPlayer('guest', {
        playerNumber: 2
    });
    const io = createFakeIo();
    const session = createGameSession(io, {
        matchSummaryAutoReturnMs: 30
    });

    eliminatePlayer('guest');
    const ended = session.resolveRoundEnd();

    assert.equal(ended, true);
    assert.equal(gameState.gameStatus, 'GAME_OVER');
    assert.equal(gameState.matchWinnerId, null);
    assert.equal(gameState.resultAutoReturnAt, 1030);

    context.mock.timers.tick(29);

    assert.equal(gameState.gameStatus, 'GAME_OVER');

    context.mock.timers.tick(1);

    assert.equal(gameState.gameStatus, 'LOBBY');
    assert.deepEqual(gameState.players, {});
    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(gameState.winsRequired, 3);
    assert.deepEqual(gameState.botConfigs, []);
    assert.equal(gameState.matchWinnerId, null);
    assert.equal(gameState.roundResult, null);
    assert.equal(gameState.resultAutoReturnAt, null);
    assert.equal(io.emitted('ROOM_STATE_UPDATE').length, 1);
    assert.equal(io.emitted('GAME_STATE_UPDATE').length, 1);
});

test('starting next round clears summary auto-return timeout', (context) => {
    resetState();
    context.mock.timers.enable({
        apis: ['Date', 'setTimeout', 'setInterval'],
        now: 1000
    });
    gameState.gameMode = GAME_MODES.MULTIPLAYER;
    gameState.gameStatus = 'PLAYING';
    gameState.winsRequired = 2;
    gameState.players.host = createHumanPlayer('host', {
        playerNumber: 1
    });
    gameState.players.guest = createHumanPlayer('guest', {
        playerNumber: 2
    });
    const session = createGameSession(createFakeIo(), {
        matchSummaryAutoReturnMs: 30
    });

    eliminatePlayer('guest');
    session.resolveRoundEnd();

    assert.equal(gameState.gameStatus, 'GAME_OVER');
    assert.equal(gameState.resultAutoReturnAt, 1030);

    const prepared = prepareNextRound();
    session.startRoundCountdown();

    assert.equal(prepared, true);
    assert.equal(gameState.gameStatus, 'COUNTDOWN');
    assert.equal(gameState.resultAutoReturnAt, null);

    context.mock.timers.tick(30);

    assert.notEqual(gameState.gameStatus, 'LOBBY');
    session.resetEmptySession();
});

test('round countdown clears bot runtime and temporary effects', () => {
    resetState();
    gameState.players.host = withRoundOnlyState(createHumanPlayer('host', {
        playerNumber: 1
    }));
    gameState.players['bot-2'] = withRoundOnlyState(createBotPlayer('bot-2', {
        playerNumber: 2,
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    }));
    const io = createFakeIo();
    const session = createTestSession(io);

    session.startRoundCountdown();

    assertPlayerRoundStateCleared(gameState.players.host);
    assertPlayerRoundStateCleared(gameState.players['bot-2']);
    assert.equal(gameState.trails.length, 0);
    assert.equal(gameState.gameStatus, 'COUNTDOWN');

    session.resetEmptySession();
});

test('next round keeps bots but clears runtime, effects and arena entities', () => {
    resetState();
    gameState.gameStatus = 'GAME_OVER';
    gameState.roundNumber = 2;
    gameState.trails = [createTrail({
        id: 'old-trail',
        x1: 1,
        y1: 1,
        x2: 2,
        y2: 2
    })];
    gameState.powerUps = [{ id: 'power-up', x: 100, y: 100 }];
    gameState.players.host = withRoundOnlyState(createHumanPlayer('host', {
        playerNumber: 1
    }));
    gameState.players['bot-2'] = withRoundOnlyState(createBotPlayer('bot-2', {
        playerNumber: 2,
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    }));

    const prepared = prepareNextRound();

    assert.equal(prepared, true);
    assert.equal(gameState.players['bot-2'].isBot, true);
    assert.equal(gameState.trails.length, 0);
    assert.equal(gameState.powerUps.length, 0);
    assertPlayerRoundStateCleared(gameState.players.host);
    assertPlayerRoundStateCleared(gameState.players['bot-2']);
});

test('returning to lobby clears arena entities and temporary player state', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.gameStatus = 'GAME_OVER';
    gameState.botConfigs = [{ difficulty: 'EASY', personality: 'SURVIVOR' }];
    gameState.trails = [createTrail({
        id: 'old-trail',
        x1: 1,
        y1: 1,
        x2: 2,
        y2: 2
    })];
    gameState.powerUps = [{ id: 'power-up', x: 100, y: 100 }];
    gameState.players.host = withRoundOnlyState(createHumanPlayer('host', {
        playerNumber: 1
    }));
    gameState.players['bot-2'] = withRoundOnlyState(createBotPlayer('bot-2', {
        playerNumber: 2,
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    }));

    resetGameToLobby();

    assert.equal(gameState.gameMode, GAME_MODES.SINGLE_PLAYER);
    assert.deepEqual(gameState.botConfigs, [
        { difficulty: 'EASY', personality: 'SURVIVOR' }
    ]);
    assert.equal(gameState.trails.length, 0);
    assert.equal(gameState.powerUps.length, 0);
    assertPlayerRoundStateCleared(gameState.players.host);
    assertPlayerRoundStateCleared(gameState.players['bot-2']);
});

test('room reset returns to a fresh empty multiplayer lobby', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.gameStatus = 'GAME_OVER';
    gameState.winsRequired = 5;
    gameState.botConfigs = [{ difficulty: 'EASY', personality: 'SURVIVOR' }];
    gameState.trails = [createTrail({
        id: 'old-trail',
        x1: 1,
        y1: 1,
        x2: 2,
        y2: 2
    })];
    gameState.powerUps = [{ id: 'power-up', x: 100, y: 100 }];
    gameState.players.host = withRoundOnlyState(createHumanPlayer('host', {
        playerNumber: 1
    }));
    gameState.players['bot-2'] = withRoundOnlyState(createBotPlayer('bot-2', {
        playerNumber: 2,
        x: 100,
        y: 100,
        dx: 4,
        dy: 0
    }));

    resetRoomToLobby();

    assert.equal(gameState.gameStatus, 'LOBBY');
    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(gameState.winsRequired, 3);
    assert.deepEqual(gameState.botConfigs, []);
    assert.deepEqual(gameState.players, {});
    assert.equal(gameState.trails.length, 0);
    assert.equal(gameState.powerUps.length, 0);
});

function createHumanPlayer(id, { playerNumber }) {
    return {
        id,
        name: id,
        playerNumber,
        x: 400,
        y: 400,
        dx: 0,
        dy: 0,
        color: `color-${playerNumber}`,
        isAlive: true,
        isBot: false,
        score: 0
    };
}

function createBotPlayer(id, { playerNumber, x, y, dx, dy }) {
    return {
        id,
        name: `${id} (Bot)`,
        playerNumber,
        x,
        y,
        dx,
        dy,
        color: `color-${playerNumber}`,
        isAlive: true,
        isBot: true,
        score: 0
    };
}

function withRoundOnlyState(player) {
    return {
        ...player,
        botRuntime: {
            nextDecisionAt: 1000,
            forceDecisionAt: 2000,
            lastTurnAt: 500
        },
        currentTrailId: 'active-trail',
        eliminatedAt: 123,
        freezeExpiresAt: 456,
        ghostExpiresAt: 789,
        hasShield: true,
        isFrozen: true,
        isGhost: true,
        teleported: true
    };
}

function assertPlayerRoundStateCleared(player) {
    assert.equal(player.botRuntime, undefined);
    assert.equal(player.currentTrailId, undefined);
    assert.equal(player.eliminatedAt, undefined);
    assert.equal(player.freezeExpiresAt, undefined);
    assert.equal(player.ghostExpiresAt, undefined);
    assert.equal(player.hasShield, false);
    assert.equal(player.isFrozen, false);
    assert.equal(player.isGhost, false);
    assert.equal(player.teleported, false);
}

function createTrail({ id, x1, y1, x2, y2 }) {
    return {
        id,
        owner: 'test-wall',
        x1,
        y1,
        x2,
        y2,
        color: '#ffffff'
    };
}

function createFakeIo() {
    const emissions = [];

    return {
        emit(event, payload) {
            emissions.push({ event, payload });
        },
        emitted(event) {
            return emissions
                .filter(emission => emission.event === event)
                .map(emission => emission.payload);
        }
    };
}

function createTestSession(io = createFakeIo()) {
    return createGameSession(io, {
        matchSummaryAutoReturnMs: 0
    });
}

function resetState() {
    Object.assign(gameState, {
        gameMode: GAME_MODES.MULTIPLAYER,
        gameStatus: 'LOBBY',
        timer: 0,
        pausedBy: null,
        systemNotice: null,
        roundNumber: 1,
        roundStartedAt: null,
        roundPausedAt: null,
        roundPausedDurationMs: 0,
        roundElapsedMs: 0,
        winsRequired: 3,
        matchWinnerId: null,
        roundResult: null,
        resultAutoReturnAt: null,
        eliminationOrder: [],
        eliminatedPlayers: {},
        players: {},
        trails: [],
        powerUps: [],
        botConfigs: []
    });
}
