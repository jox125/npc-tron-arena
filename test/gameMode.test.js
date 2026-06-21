import test from 'node:test';
import assert from 'node:assert/strict';

import { gameState } from '../src/gameEngine.js';
import { BOT_DIFFICULTIES, BOT_PERSONALITIES } from '../src/botConfig.js';
import { GAME_MODES } from '../src/server/gameModes.js';
import { registerLobbyHandlers } from '../src/server/lobbyHandlers.js';

test('host can switch to single-player and receives a default bot', () => {
    resetState();
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { io, socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_GAME_MODE', {
        gameMode: GAME_MODES.SINGLE_PLAYER
    });

    assert.equal(gameState.gameMode, GAME_MODES.SINGLE_PLAYER);
    assert.deepEqual(gameState.botConfigs, [
        {
            difficulty: BOT_DIFFICULTIES.EASY,
            personality: BOT_PERSONALITIES.SURVIVOR
        }
    ]);
    assert.equal(gameState.players['bot-2'].isBot, true);
    assert.equal(gameState.players['bot-2'].isHost, false);
    assert.equal(io.emitted('GAME_STATE_UPDATE').length, 1);
    assert.equal(io.emitted('ROOM_STATE_UPDATE').length, 1);
});

test('non-host cannot change game mode', () => {
    resetState();
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    gameState.players.guest = createHumanPlayer('guest', {
        isHost: false,
        playerNumber: 2
    });
    const { socket } = createLobbyHarness('guest');

    socket.trigger('UPDATE_GAME_MODE', {
        gameMode: GAME_MODES.SINGLE_PLAYER
    });

    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(socket.emitted('GAME_MODE_ERROR').length, 1);
});

test('game mode cannot change outside lobby', () => {
    resetState();
    gameState.gameStatus = 'PLAYING';
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_GAME_MODE', {
        gameMode: GAME_MODES.SINGLE_PLAYER
    });

    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(socket.emitted('GAME_MODE_ERROR').length, 1);
});

test('unknown game mode is rejected', () => {
    resetState();
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_GAME_MODE', {
        gameMode: 'OFFLINE'
    });

    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(socket.emitted('GAME_MODE_ERROR').length, 1);
});

test('single-player cannot be selected with multiple humans in lobby', () => {
    resetState();
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    gameState.players.guest = createHumanPlayer('guest', {
        isHost: false,
        playerNumber: 2
    });
    const { socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_GAME_MODE', {
        gameMode: GAME_MODES.SINGLE_PLAYER
    });

    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.equal(socket.emitted('GAME_MODE_ERROR').length, 1);
});

test('joining lobby is refused while single-player is active', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { socket } = createLobbyHarness('guest');

    socket.trigger('JOIN_LOBBY', {
        name: 'Guest'
    });

    assert.equal(gameState.players.guest, undefined);
    assert.deepEqual(socket.emitted('JOIN_ERROR')[0], {
        code: 'SINGLE_PLAYER_ACTIVE',
        message: 'Single-player match is active.'
    });
});

test('host can create one, two and three bots through bot settings', () => {
    for (const opponentCount of [1, 2, 3]) {
        resetState();
        gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
        gameState.players.host = createHumanPlayer('host', {
            isHost: true,
            playerNumber: 1
        });
        const { io, socket } = createLobbyHarness('host');

        socket.trigger('UPDATE_BOT_SETTINGS', {
            opponentCount,
            configs: createConfigs(opponentCount)
        });

        const bots = Object.values(gameState.players)
            .filter(player => player.isBot);
        assert.equal(bots.length, opponentCount);
        assert.equal(gameState.botConfigs.length, opponentCount);
        assert.equal(io.emitted('ROOM_STATE_UPDATE').length, 1);
        assert.equal(io.emitted('GAME_STATE_UPDATE').length, 1);
    }
});

test('created bots have unique ids, numbers and colors and never become host', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_BOT_SETTINGS', {
        opponentCount: 3,
        configs: createConfigs(3)
    });

    const bots = Object.values(gameState.players)
        .filter(player => player.isBot);

    assert.deepEqual(bots.map(bot => bot.id).sort(), [
        'bot-2',
        'bot-3',
        'bot-4'
    ]);
    assert.equal(new Set(bots.map(bot => bot.playerNumber)).size, 3);
    assert.equal(new Set(bots.map(bot => bot.color)).size, 3);
    assert.equal(bots.every(bot => bot.isHost === false), true);
});

test('invalid bot settings are rejected', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_BOT_SETTINGS', {
        opponentCount: 1,
        configs: [
            {
                difficulty: 'IMPOSSIBLE',
                personality: BOT_PERSONALITIES.SURVIVOR
            }
        ]
    });

    assert.equal(gameState.botConfigs.length, 0);
    assert.equal(socket.emitted('BOT_SETTINGS_ERROR').length, 1);
});

test('reducing bot count removes only extra bots and preserves remaining bots', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    const { socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_BOT_SETTINGS', {
        opponentCount: 3,
        configs: createConfigs(3)
    });

    const originalBot2 = gameState.players['bot-2'];
    const originalBot3 = gameState.players['bot-3'];

    socket.trigger('UPDATE_BOT_SETTINGS', {
        opponentCount: 2,
        configs: createConfigs(2)
    });

    assert.equal(gameState.players['bot-2'], originalBot2);
    assert.equal(gameState.players['bot-3'], originalBot3);
    assert.equal(gameState.players['bot-4'], undefined);
});

test('switching back to multiplayer removes bots', () => {
    resetState();
    gameState.gameMode = GAME_MODES.SINGLE_PLAYER;
    gameState.players.host = createHumanPlayer('host', {
        isHost: true,
        playerNumber: 1
    });
    gameState.botConfigs = createConfigs(2);
    gameState.players['bot-2'] = createBotPlayer(2);
    gameState.players['bot-3'] = createBotPlayer(3);
    const { io, socket } = createLobbyHarness('host');

    socket.trigger('UPDATE_GAME_MODE', {
        gameMode: GAME_MODES.MULTIPLAYER
    });

    assert.equal(gameState.gameMode, GAME_MODES.MULTIPLAYER);
    assert.deepEqual(gameState.botConfigs, []);
    assert.deepEqual(Object.keys(gameState.players), ['host']);
    assert.equal(io.emitted('ROOM_STATE_UPDATE').length, 1);
});

function createLobbyHarness(socketId) {
    const io = createFakeIo();
    const socket = createFakeSocket(socketId);
    registerLobbyHandlers({ io, socket });
    return { io, socket };
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

function createHumanPlayer(id, { isHost, playerNumber }) {
    return {
        id,
        name: id,
        playerNumber,
        x: 400,
        y: 400,
        dx: 0,
        dy: 0,
        color: `color-${playerNumber}`,
        isHost,
        isAlive: true,
        score: 0
    };
}

function createBotPlayer(playerNumber) {
    return {
        id: `bot-${playerNumber}`,
        name: `Bot ${playerNumber} (Bot)`,
        playerNumber,
        x: 400,
        y: 400,
        dx: 0,
        dy: 0,
        color: `color-${playerNumber}`,
        isHost: false,
        isAlive: true,
        score: 0,
        isBot: true,
        difficulty: BOT_DIFFICULTIES.EASY,
        personality: BOT_PERSONALITIES.SURVIVOR
    };
}

function createConfigs(count) {
    const configs = [
        {
            difficulty: BOT_DIFFICULTIES.EASY,
            personality: BOT_PERSONALITIES.SURVIVOR
        },
        {
            difficulty: BOT_DIFFICULTIES.MEDIUM,
            personality: BOT_PERSONALITIES.HUNTER
        },
        {
            difficulty: BOT_DIFFICULTIES.HARD,
            personality: BOT_PERSONALITIES.COLLECTOR
        }
    ];

    return configs.slice(0, count);
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
