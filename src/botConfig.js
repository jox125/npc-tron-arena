import {ARENA_HEIGHT, ARENA_WIDTH, gameState} from "./gameEngine.js";
import {PLAYER_COLORS} from "./server/playerRegistry.js";

export const BOT_DIFFICULTIES = Object.freeze({
    EASY: "EASY",
    MEDIUM: "MEDIUM",
    HARD: "HARD"
});
export const BOT_PERSONALITIES = Object.freeze({
    SURVIVOR: "SURVIVOR",
    HUNTER: "HUNTER",
    COLLECTOR: "COLLECTOR"
});
const BOT_NAMES = Object.freeze({
    1: "Zepp", 11: "Cody", 21: "Kelsy", 31: "Ariel",
    2: "Lucero", 12: "Rashad", 22: "Faven", 32: "Estel",
    3: "Amore", 13: "Dodie", 23: "Bayo", 33: "Winona",
    4: "Amour", 14: "Bonamy", 24: "Eagor", 34: "Nicole",
    5: "Optimus", 15: "Amicia", 25: "Ryn", 35: "Walter",
    6: "Trevor", 16: "Carine", 26: "Lyka", 36: "Neil",
    7: "Ulima", 17: "Solada", 27: "Gedith", 37: "Derek",
    8: "Thaddeus", 18: "Dakota", 28: "Kaida", 38: "Taylor",
    9: "Ravyn", 19: "Rona", 29: "Hydra", 39: "Raymond",
    10: "Hugo", 20: "Rinc", 30: "Pendragon", 40: "Lincoln"
});

export function createBot({playerNumber, difficulty, personality, name}) {

    return {
        id: "bot-" + playerNumber,
        name: name,
        playerNumber: playerNumber,
        x: ARENA_WIDTH / 2,
        y: ARENA_HEIGHT / 2,
        dx: 0,
        dy: 0,
        color: PLAYER_COLORS[playerNumber - 1],
        isHost: false,
        isAlive: true,
        score: 0,
        isBot: true,
        difficulty: difficulty,
        personality: personality
    }

}

export function validateBotConfigs(configs, expectedCount) {
    if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 3) {
        return {
            valid: false,
            message: 'Opponent count must be between 1 and 3.'
        };
    }

    if (!Array.isArray(configs) || configs.length !== expectedCount) {
        return {
            valid: false,
            message: 'Bot configuration count does not match opponent count.'
        };
    }

    const validDifficulties = Object.values(BOT_DIFFICULTIES);
    const validPersonalities = Object.values(BOT_PERSONALITIES);

    const normalizedConfigs = [];

    for (const config of configs) {
        if (!validDifficulties.includes(config?.difficulty)) {
            return {
                valid: false,
                message: 'Unknown bot difficulty.'
            };
        }

        if (!validPersonalities.includes(config?.personality)) {
            return {
                valid: false,
                message: 'Unknown bot personality.'
            };
        }

        normalizedConfigs.push({
            difficulty: config.difficulty,
            personality: config.personality
        });
    }

    return {
        valid: true,
        configs: normalizedConfigs
    };
}

export function chooseBotNames(count, unavailableNames = []) {
    const unavailable = new Set(
        unavailableNames.map(name => name.toLowerCase())
    );

    const availableNames = Object.values(BOT_NAMES)
        .filter(name => !unavailable.has(name.toLowerCase()));

    return shuffle(availableNames).slice(0, count);
}