import {gameState, resetGameToLobby} from '../gameEngine.js';
import {createPlayer, ensureHost} from './playerRegistry.js';
import {GAME_MODES} from "./gameModes.js";
import {chooseBotNames, createBot, validateBotConfigs} from "../botConfig.js";

/**
 * Registers events that are valid while players are waiting in the lobby.
 */
export function registerLobbyHandlers({io, socket}) {
    socket.on('JOIN_LOBBY', (data = {}) => {
        if (gameState.gameStatus !== 'LOBBY') {
            socket.emit('JOIN_ERROR', {
                code: 'MATCH_IN_PROGRESS',
                message:
                    'A match is currently in progress. Wait for the next lobby.'
            });
            return;
        }

        if (gameState.gameMode === GAME_MODES.SINGLE_PLAYER) {
            socket.emit('JOIN_ERROR', {
                code: 'SINGLE_PLAYER_ACTIVE',
                message: 'Single-player match is active.'
            });
            return;
        }

        const players = Object.values(gameState.players);

        if (players.length >= 4) {
            socket.emit('JOIN_ERROR', {
                message: 'Arena is full! Maximum 4 players.'
            });
            return;
        }

        const requestedName = String(data.name ?? '').trim();
        if (requestedName.length < 2 || requestedName.length > 16) {
            socket.emit('JOIN_ERROR', {
                message: 'Name must contain between 2 and 16 characters.'
            });
            return;
        }

        const nameExists = players.some(player =>
            player.name.toLowerCase() === requestedName.toLowerCase()
        );

        if (nameExists) {
            socket.emit('JOIN_ERROR', {
                message: 'Name already taken. Choose a unique name.'
            });
            return;
        }

        gameState.players[socket.id] = createPlayer(
            socket.id,
            requestedName
        );

        socket.emit('JOIN_SUCCESS', {playerId: socket.id});
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
    });

    socket.on('LEAVE_LOBBY', () => {
        const player = gameState.players[socket.id];
        if (!player || gameState.gameStatus !== 'LOBBY') {
            socket.emit('LEAVE_LOBBY_ERROR', {
                message: 'You can only leave while waiting in the lobby.'
            });
            return;
        }

        delete gameState.players[socket.id];

        if (!hasHumanPlayers()) {
            gameState.players = {};
            resetGameToLobby();
        }

        ensureHost(io);

        socket.emit('LEAVE_LOBBY_SUCCESS');
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    socket.on('UPDATE_MATCH_SETTINGS', ({winsRequired} = {}) => {
        const player = gameState.players[socket.id];
        if (!player?.isHost || gameState.gameStatus !== 'LOBBY') {
            socket.emit('MATCH_SETTINGS_ERROR', {
                message: 'Only the room host can change lobby settings.'
            });
            return;
        }

        const requestedWins = Number(winsRequired);
        if (
            !Number.isInteger(requestedWins)
            || requestedWins < 1
            || requestedWins > 5
        ) {
            socket.emit('MATCH_SETTINGS_ERROR', {
                message: 'Required round wins must be between 1 and 5.'
            });
            return;
        }

        gameState.winsRequired = requestedWins;
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    socket.on("UPDATE_GAME_MODE", ({gameMode} = {}) => {
        const player = gameState.players[socket.id];

        if (!player?.isHost || gameState.gameStatus !== 'LOBBY') {
            socket.emit('GAME_MODE_ERROR', {
                message: 'Only the room host can change game mode.'
            });
            return;
        }

        if (!Object.values(GAME_MODES).includes(gameMode)) {
            socket.emit('GAME_MODE_ERROR', {
                message: 'Unknown game mode.'
            });
            return;
        }
        if (gameMode === GAME_MODES.SINGLE_PLAYER && Object.values(gameState.players).length > 1) {
            socket.emit('GAME_MODE_ERROR', {
                message: 'Single play mode allowed only when no other human players available'
            });
            return;
        }
        if (gameMode === GAME_MODES.MULTIPLAYER) {
            removeBotsFromLobby();
            gameState.botConfigs = [];
            io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        }
        if (gameMode === GAME_MODES.SINGLE_PLAYER && gameState.botConfigs.length === 0) {
            gameState.botConfigs = [{
                difficulty: 'EASY',
                personality: 'SURVIVOR'
            }];
            syncLobbyBots(gameState.botConfigs);
            io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        }

        gameState.gameMode = gameMode;
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    socket.on("UPDATE_BOT_SETTINGS", ({configs, opponentCount}) => {
        const player = gameState.players[socket.id];

        if (!player ||
            !player?.isHost ||
            gameState.gameStatus !== 'LOBBY' ||
            gameState.gameMode !== GAME_MODES.SINGLE_PLAYER ||
            !Number.isInteger(opponentCount)
            || opponentCount < 1
            || opponentCount > 3
            ) {
            socket.emit('BOT_SETTINGS_ERROR', {
                message: "Bots configuration (1-3) only allowed in single player mode by game host."
            });
            return;
        }

        const validation = validateBotConfigs(configs, opponentCount);

        if (!validation.valid) {
            socket.emit('BOT_SETTINGS_ERROR', {
                message: validation.message
            });
            return;
        }

        gameState.botConfigs = validation.configs;
        syncLobbyBots(validation.configs);
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });
}

function removeBotsFromLobby() {
    Object.keys(gameState.players)
        .filter(id => gameState.players[id].isBot)
        .forEach(id => delete gameState.players[id]);
}

function syncLobbyBots(configs) {
    removeBotsFromLobby();

    const humanNames = Object.values(gameState.players)
        .filter(player => player.isBot !== true)
        .map(player => player.name);

    const botNames = chooseBotNames(configs.length, humanNames);

    configs.forEach((config, index) => {
        const playerNumber = index + 2;
        const bot = createBot({
            ...config,
            name: botNames[index],
            playerNumber
        });

        gameState.players[bot.id] = bot;
    });
}

function hasHumanPlayers() {
    return Object.values(gameState.players)
        .some(player => player.isBot !== true);
}
