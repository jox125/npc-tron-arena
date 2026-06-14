import { gameState } from '../gameEngine.js';
import { createPlayer, ensureHost } from './playerRegistry.js';

/**
 * Registers events that are valid while players are waiting in the lobby.
 */
export function registerLobbyHandlers({ io, socket }) {
    socket.on('JOIN_LOBBY', (data = {}) => {
        if (gameState.gameStatus !== 'LOBBY') {
            socket.emit('JOIN_ERROR', {
                code: 'MATCH_IN_PROGRESS',
                message:
                    'A match is currently in progress. Wait for the next lobby.'
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

        socket.emit('JOIN_SUCCESS', { playerId: socket.id });
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
        ensureHost(io);

        socket.emit('LEAVE_LOBBY_SUCCESS');
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    socket.on('UPDATE_MATCH_SETTINGS', ({ winsRequired } = {}) => {
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
}
