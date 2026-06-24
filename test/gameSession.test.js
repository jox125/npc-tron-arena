import test from 'node:test';
import assert from 'node:assert/strict';

import {
    eliminatePlayer,
    gameState
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
    const session = createGameSession(createFakeIo());

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
    const session = createGameSession(createFakeIo());

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
    const session = createGameSession(createFakeIo());

    eliminatePlayer('host');
    const ended = session.resolveRoundEnd();

    assert.equal(ended, false);
    assert.equal(gameState.gameStatus, 'PLAYING');
    assert.equal(gameState.roundResult, null);
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
    return {
        emit() {}
    };
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
        eliminationOrder: [],
        eliminatedPlayers: {},
        players: {},
        trails: [],
        powerUps: [],
        botConfigs: []
    });
}
