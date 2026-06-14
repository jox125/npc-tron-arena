import {
    gameState,
    resetGameToLobby,
    startNewTrailSegment
} from '../gameEngine.js';
import { ensureHost } from './playerRegistry.js';

/**
 * Registers real-time player input and connection cleanup.
 */
export function registerPlayerHandlers({ io, socket, session }) {
    socket.on('PLAYER_INPUT', (data = {}) => {
        const player = gameState.players[socket.id];
        if (!player || !player.isAlive || gameState.gameStatus !== 'PLAYING') {
            return;
        }

        let turned = false;

        switch (data.turn) {
            case 'UP':
                if (player.dy === 0) {
                    player.dx = 0;
                    player.dy = -4;
                    turned = true;
                }
                break;
            case 'DOWN':
                if (player.dy === 0) {
                    player.dx = 0;
                    player.dy = 4;
                    turned = true;
                }
                break;
            case 'LEFT':
                if (player.dx === 0) {
                    player.dx = -4;
                    player.dy = 0;
                    turned = true;
                }
                break;
            case 'RIGHT':
                if (player.dx === 0) {
                    player.dx = 4;
                    player.dy = 0;
                    turned = true;
                }
                break;
            default:
                return;
        }

        if (turned) {
            startNewTrailSegment(player);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        if (['PLAYING', 'PAUSED'].includes(gameState.gameStatus)) {
            session.removePlayerFromMatch(socket.id);
        } else {
            delete gameState.players[socket.id];
        }

        const playerCount = Object.keys(gameState.players).length;

        if (gameState.gameStatus === 'COUNTDOWN' && playerCount < 2) {
            session.resetEmptySession();
        } else if (playerCount === 0) {
            session.resetEmptySession();
        }

        ensureHost(io);
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });
}
