import {
    gameState,
    prepareNextRound,
    resetGameToLobby
} from '../gameEngine.js';
import {getPlayerIdentity} from './playerRegistry.js';
import {canStartMatch} from "./matchRules.js";

/**
 * Registers match lifecycle and menu actions.
 */
export function registerMatchHandlers({io, socket, session}) {
    socket.on('START_GAME', () => {
        const player = getHumanSocketPlayer(socket);
        const validatedStart = canStartMatch(gameState, player);

        if (!validatedStart.valid) {
            socket.emit('START_ERROR', {
                message: validatedStart.message
            });
            return;
        }

        gameState.roundNumber = 1;
        gameState.matchWinnerId = null;
        Object.values(gameState.players).forEach(currentPlayer => {
            currentPlayer.score = 0;
        });

        session.startRoundCountdown();

    });

socket.on('PAUSE_GAME', () => {
    const player = getHumanSocketPlayer(socket);
    if (!player || gameState.gameStatus !== 'PLAYING') return;

    session.pauseRoundTimer();
    gameState.gameStatus = 'PAUSED';
    gameState.pausedBy = getPlayerIdentity(player);
    session.setSystemNotice(
        'PAUSED',
        player,
        `P${player.playerNumber} // ${player.name} paused the match.`
    );
    io.emit('GAME_STATE_UPDATE', gameState);
});

socket.on('RESUME_GAME', () => {
    const player = getHumanSocketPlayer(socket);
    if (!player || gameState.gameStatus !== 'PAUSED') return;

    session.resumeRoundTimer();
    gameState.gameStatus = 'PLAYING';
    gameState.pausedBy = null;
    session.setSystemNotice(
        'RESUMED',
        player,
        `P${player.playerNumber} // ${player.name} resumed the match.`
    );
    io.emit('GAME_STATE_UPDATE', gameState);
});

socket.on('QUIT_MATCH', () => {
    const player = getHumanSocketPlayer(socket);
    if (!player || !['PLAYING', 'PAUSED'].includes(gameState.gameStatus)) {
        socket.emit('QUIT_MATCH_ERROR', {
            message: 'You can only quit an active match.'
        });
        return;
    }

    session.setSystemNotice(
        'QUIT',
        player,
        `P${player.playerNumber} // ${player.name} quit the match.`
    );
    session.removePlayerFromMatch(socket.id);
    socket.emit('QUIT_MATCH_SUCCESS');
    io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
    io.emit('GAME_STATE_UPDATE', gameState);
});

socket.on('START_NEXT_ROUND', () => {
    const player = getHumanSocketPlayer(socket);
    if (!player?.isHost) {
        socket.emit('ROUND_ACTION_ERROR', {
            message: 'Only the room host can start the next round.'
        });
        return;
    }

    if (gameState.gameStatus !== 'GAME_OVER' || gameState.matchWinnerId) {
        socket.emit('ROUND_ACTION_ERROR', {
            message: 'The next round cannot be started now.'
        });
        return;
    }

    if (Object.keys(gameState.players).length < 2) {
        socket.emit('ROUND_ACTION_ERROR', {
            message: 'At least 2 players are required for the next round.'
        });
        return;
    }

    if (!prepareNextRound()) {
        socket.emit('ROUND_ACTION_ERROR', {
            message: 'The next round could not be prepared.'
        });
        return;
    }

    session.startRoundCountdown();
});

socket.on('RETURN_TO_LOBBY', () => {
    const player = getHumanSocketPlayer(socket);
    if (!player?.isHost) {
        socket.emit('RETURN_TO_LOBBY_ERROR', {
            message: 'Only the room host can return the room to the lobby.'
        });
        return;
    }

    if (gameState.gameStatus !== 'GAME_OVER') {
        socket.emit('RETURN_TO_LOBBY_ERROR', {
            message:
                'The round must be finished before returning to the lobby.'
        });
        return;
    }

    resetGameToLobby();
    io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
    io.emit('GAME_STATE_UPDATE', gameState);
});
}

function getHumanSocketPlayer(socket) {
    const player = gameState.players[socket.id];

    if (!player || player.isBot === true) return null;

    return player;
}
