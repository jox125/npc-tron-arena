import { gameState } from '../gameEngine.js';
import { registerLobbyHandlers } from './lobbyHandlers.js';
import { registerMatchHandlers } from './matchHandlers.js';
import { registerPlayerHandlers } from './playerHandlers.js';

/**
 * Connects one Socket.IO client to the game's event handlers.
 *
 * Each handler module owns one area of responsibility:
 * lobby setup, match lifecycle or real-time player actions.
 */
export function registerSocketHandlers({ io, socket, session }) {
    console.log(`Player connected: ${socket.id}`);
    socket.emit('GAME_STATE_UPDATE', gameState);

    const dependencies = { io, socket, session };
    registerLobbyHandlers(dependencies);
    registerMatchHandlers(dependencies);
    registerPlayerHandlers(dependencies);
}
