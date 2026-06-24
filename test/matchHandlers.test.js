import test from 'node:test';
import assert from 'node:assert/strict';

import { gameState } from '../src/gameEngine.js';
import { registerMatchHandlers } from '../src/server/matchHandlers.js';
import { GAME_MODES } from '../src/server/gameModes.js';

test('bot id cannot start a match even if marked as host', () => {
    resetState();
    gameState.gameStatus = 'LOBBY';
    gameState.players['bot-2'] = createBotPlayer('bot-2', {
        isHost: true
    });
    gameState.players.host = createHumanPlayer('host');
    const { session, socket } = createMatchHarness('bot-2');

    socket.trigger('START_GAME');

    assert.equal(socket.emitted('START_ERROR').length, 1);
    assert.equal(session.startRoundCountdownCalls, 0);
    assert.equal(gameState.gameStatus, 'LOBBY');
});

test('bot id cannot pause or resume the match', () => {
    resetState();
    gameState.gameStatus = 'PLAYING';
    gameState.players['bot-2'] = createBotPlayer('bot-2');
    const { session, socket } = createMatchHarness('bot-2');

    socket.trigger('PAUSE_GAME');

    assert.equal(session.pauseRoundTimerCalls, 0);
    assert.equal(gameState.gameStatus, 'PLAYING');

    gameState.gameStatus = 'PAUSED';
    socket.trigger('RESUME_GAME');

    assert.equal(session.resumeRoundTimerCalls, 0);
    assert.equal(gameState.gameStatus, 'PAUSED');
});

test('bot id cannot quit an active match', () => {
    resetState();
    gameState.gameStatus = 'PLAYING';
    gameState.players['bot-2'] = createBotPlayer('bot-2');
    const { session, socket } = createMatchHarness('bot-2');

    socket.trigger('QUIT_MATCH');

    assert.equal(session.removePlayerFromMatchCalls.length, 0);
    assert.equal(gameState.players['bot-2'].isAlive, true);
    assert.equal(socket.emitted('QUIT_MATCH_ERROR').length, 1);
});

test('bot id cannot start next round or return to lobby', () => {
    resetState();
    gameState.gameStatus = 'GAME_OVER';
    gameState.players['bot-2'] = createBotPlayer('bot-2', {
        isHost: true
    });
    gameState.players.host = createHumanPlayer('host');
    const { session, socket } = createMatchHarness('bot-2');

    socket.trigger('START_NEXT_ROUND');
    socket.trigger('RETURN_TO_LOBBY');

    assert.equal(session.startRoundCountdownCalls, 0);
    assert.equal(gameState.gameStatus, 'GAME_OVER');
    assert.equal(socket.emitted('ROUND_ACTION_ERROR').length, 1);
    assert.equal(socket.emitted('RETURN_TO_LOBBY_ERROR').length, 1);
});

function createMatchHarness(socketId) {
    const io = createFakeIo();
    const socket = createFakeSocket(socketId);
    const session = createFakeSession();

    registerMatchHandlers({
        io,
        socket,
        session
    });

    return {
        io,
        session,
        socket
    };
}

function createFakeSocket(id) {
    const handlers = new Map();
    const emissions = [];

    return {
        id,
        on(event, handler) {
            handlers.set(event, handler);
        },
        emit(event, payload) {
            emissions.push({ event, payload });
        },
        trigger(event, payload) {
            handlers.get(event)?.(payload);
        },
        emitted(event) {
            return emissions
                .filter(emission => emission.event === event)
                .map(emission => emission.payload);
        }
    };
}

function createFakeIo() {
    return {
        emit() {}
    };
}

function createFakeSession() {
    return {
        pauseRoundTimerCalls: 0,
        removePlayerFromMatchCalls: [],
        resumeRoundTimerCalls: 0,
        setSystemNoticeCalls: [],
        startRoundCountdownCalls: 0,
        pauseRoundTimer() {
            this.pauseRoundTimerCalls++;
        },
        removePlayerFromMatch(playerId) {
            this.removePlayerFromMatchCalls.push(playerId);
        },
        resumeRoundTimer() {
            this.resumeRoundTimerCalls++;
        },
        setSystemNotice(...args) {
            this.setSystemNoticeCalls.push(args);
        },
        startRoundCountdown() {
            this.startRoundCountdownCalls++;
        }
    };
}

function createHumanPlayer(id) {
    return {
        id,
        name: id,
        playerNumber: 1,
        x: 400,
        y: 400,
        dx: 0,
        dy: 0,
        color: 'human-color',
        isAlive: true,
        isBot: false,
        isHost: true,
        score: 0
    };
}

function createBotPlayer(id, { isHost = false } = {}) {
    return {
        id,
        name: `${id} (Bot)`,
        playerNumber: 2,
        x: 400,
        y: 400,
        dx: 4,
        dy: 0,
        color: 'bot-color',
        isAlive: true,
        isBot: true,
        isHost,
        score: 0
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
