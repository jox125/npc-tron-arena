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

export function createBot({playerNumber, difficulty, personality}) {

    return {
        id: "bot-" + playerNumber,
        name: chooseBotName(),
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

function validateBotConfigs(configs, expectedCount) {

}

function chooseBotName() {
    const players = Object.values(gameState.players);
    let name = "";
    do {
        name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.keys().length + 2)]
    } while (players.some(player => player.name === name))

    return name;
}