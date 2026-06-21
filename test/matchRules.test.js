import test from 'node:test';
import assert from 'node:assert/strict';

import { GAME_MODES } from '../src/server/gameModes.js';
import { canStartMatch } from '../src/server/matchRules.js';

test('multiplayer cannot start with one human player', () => {
    const host = createHumanPlayer('host', true);
    const state = createState({
        gameMode: GAME_MODES.MULTIPLAYER,
        players: [host]
    });

    const result = canStartMatch(state, host);

    assert.equal(result.valid, false);
});

test('multiplayer can start with two human players', () => {
    const host = createHumanPlayer('host', true);
    const guest = createHumanPlayer('guest', false);
    const state = createState({
        gameMode: GAME_MODES.MULTIPLAYER,
        players: [host, guest]
    });

    const result = canStartMatch(state, host);

    assert.deepEqual(result, {
        valid: true
    });
});

test('multiplayer cannot start when bots are present', () => {
    const host = createHumanPlayer('host', true);
    const guest = createHumanPlayer('guest', false);
    const bot = createBotPlayer('bot-2');
    const state = createState({
        gameMode: GAME_MODES.MULTIPLAYER,
        players: [host, guest, bot]
    });

    const result = canStartMatch(state, host);

    assert.equal(result.valid, false);
});

test('single-player cannot start without bots', () => {
    const host = createHumanPlayer('host', true);
    const state = createState({
        gameMode: GAME_MODES.SINGLE_PLAYER,
        players: [host]
    });

    const result = canStartMatch(state, host);

    assert.equal(result.valid, false);
});

test('single-player can start with one host and one, two or three bots', () => {
    for (const botCount of [1, 2, 3]) {
        const host = createHumanPlayer('host', true);
        const bots = Array.from(
            { length: botCount },
            (_, index) => createBotPlayer(`bot-${index + 2}`)
        );
        const state = createState({
            gameMode: GAME_MODES.SINGLE_PLAYER,
            players: [host, ...bots]
        });

        const result = canStartMatch(state, host);

        assert.deepEqual(result, {
            valid: true
        });
    }
});

test('single-player cannot start with two human players', () => {
    const host = createHumanPlayer('host', true);
    const guest = createHumanPlayer('guest', false);
    const bot = createBotPlayer('bot-2');
    const state = createState({
        gameMode: GAME_MODES.SINGLE_PLAYER,
        players: [host, guest, bot]
    });

    const result = canStartMatch(state, host);

    assert.equal(result.valid, false);
});

test('start match rejects non-host, non-lobby and unknown mode states', () => {
    const host = createHumanPlayer('host', true);
    const guest = createHumanPlayer('guest', false);

    assert.equal(
        canStartMatch(createState({
            gameMode: GAME_MODES.MULTIPLAYER,
            players: [host, guest]
        }), guest).valid,
        false
    );

    assert.equal(
        canStartMatch(createState({
            gameMode: GAME_MODES.MULTIPLAYER,
            gameStatus: 'PLAYING',
            players: [host, guest]
        }), host).valid,
        false
    );

    assert.equal(
        canStartMatch(createState({
            gameMode: 'OFFLINE',
            players: [host, guest]
        }), host).valid,
        false
    );
});

function createState({ gameMode, players, gameStatus = 'LOBBY' }) {
    return {
        gameMode,
        gameStatus,
        players: Object.fromEntries(
            players.map(player => [player.id, player])
        )
    };
}

function createHumanPlayer(id, isHost) {
    return {
        id,
        name: id,
        isBot: false,
        isHost
    };
}

function createBotPlayer(id) {
    return {
        id,
        name: `${id} (Bot)`,
        isBot: true,
        isHost: false
    };
}
