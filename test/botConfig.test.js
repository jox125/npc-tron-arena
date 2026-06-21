import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BOT_DIFFICULTIES,
    BOT_PERSONALITIES,
    chooseBotNames,
    createBot,
    validateBotConfigs
} from '../src/botConfig.js';

test('createBot creates a server-owned non-host bot player', () => {
    const bot = createBot({
        playerNumber: 2,
        difficulty: BOT_DIFFICULTIES.MEDIUM,
        personality: BOT_PERSONALITIES.HUNTER,
        name: 'Vector'
    });

    assert.equal(bot.id, 'bot-2');
    assert.equal(bot.name, 'Vector (Bot)');
    assert.equal(bot.playerNumber, 2);
    assert.equal(bot.isBot, true);
    assert.equal(bot.isHost, false);
    assert.equal(bot.isAlive, true);
    assert.equal(bot.score, 0);
    assert.equal(bot.difficulty, BOT_DIFFICULTIES.MEDIUM);
    assert.equal(bot.personality, BOT_PERSONALITIES.HUNTER);
    assert.equal(typeof bot.color, 'string');
});

test('validateBotConfigs accepts and normalizes valid bot configs', () => {
    const validation = validateBotConfigs([
        {
            difficulty: BOT_DIFFICULTIES.EASY,
            personality: BOT_PERSONALITIES.SURVIVOR,
            id: 'client-controlled-id',
            isHost: true
        },
        {
            difficulty: BOT_DIFFICULTIES.HARD,
            personality: BOT_PERSONALITIES.COLLECTOR,
            playerNumber: 4
        }
    ], 2);

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.configs, [
        {
            difficulty: BOT_DIFFICULTIES.EASY,
            personality: BOT_PERSONALITIES.SURVIVOR
        },
        {
            difficulty: BOT_DIFFICULTIES.HARD,
            personality: BOT_PERSONALITIES.COLLECTOR
        }
    ]);
});

test('validateBotConfigs rejects invalid opponent counts', () => {
    assert.equal(validateBotConfigs([], 0).valid, false);
    assert.equal(validateBotConfigs([], 4).valid, false);
    assert.equal(validateBotConfigs([], 1.5).valid, false);
});

test('validateBotConfigs rejects mismatched config count', () => {
    const validation = validateBotConfigs([
        {
            difficulty: BOT_DIFFICULTIES.EASY,
            personality: BOT_PERSONALITIES.SURVIVOR
        }
    ], 2);

    assert.equal(validation.valid, false);
});

test('validateBotConfigs rejects unknown difficulty and personality', () => {
    assert.equal(validateBotConfigs([
        {
            difficulty: 'IMPOSSIBLE',
            personality: BOT_PERSONALITIES.SURVIVOR
        }
    ], 1).valid, false);

    assert.equal(validateBotConfigs([
        {
            difficulty: BOT_DIFFICULTIES.EASY,
            personality: 'WIZARD'
        }
    ], 1).valid, false);
});

test('chooseBotNames returns unique names and avoids unavailable names', () => {
    const names = chooseBotNames(3, ['Zepp', 'Lucero']);

    assert.equal(names.length, 3);
    assert.equal(new Set(names).size, 3);
    assert.equal(names.includes('Zepp'), false);
    assert.equal(names.includes('Lucero'), false);
});
