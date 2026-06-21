import {GAME_MODES} from "./gameModes.js";

export function getHumanPlayers(players) {
    return players.filter(player => player.isBot !== true);
}

export function getBotPlayers(players) {
    return players.filter(player => player.isBot === true);
}

export function canStartMatch(gameState, player) {
    const players = Object.values(gameState.players);
    const humanPlayers = getHumanPlayers(players);
    const botPlayers = getBotPlayers(players);

    if (!player?.isHost) {
        return {
            valid: false,
            message: 'Only the room host can start the match.'
        };
    }

    if (gameState.gameStatus !== 'LOBBY') {
        return {
            valid: false,
            message: 'The match has already started.'
        };
    }

    if (!Object.values(GAME_MODES).includes(gameState.gameMode)) {
        return {
            valid: false,
            message: 'Unknown game mode.'
        };
    }

    if (gameState.gameMode === GAME_MODES.MULTIPLAYER) {
        if (humanPlayers.length < 2 || botPlayers.length > 0) {
            return {
                valid: false,
                message: 'At least 2 human players are required to start.'
            };
        }
    }

    if (gameState.gameMode === GAME_MODES.SINGLE_PLAYER) {
        if (humanPlayers.length !== 1 ||
            humanPlayers[0].isHost !== true ||
            botPlayers.length < 1 ||
            botPlayers.length > 3
        ) {
            return {
                valid: false,
                message: 'Single-player requires 1 human host and 1-3 bots.'
            };
        }
    }

    return {
        valid: true
    };
}