import {
    handleGameAudio,
    playPowerUpCue
} from '../audio.js';
import {
    renderCountdown,
    renderPaused,
    renderRoundResult,
    showHostChanged,
    showJoinMessage,
    showMatchInProgress,
    showPauseMenuError,
    showReturnToLobbyError,
    showScreen,
    showStartError,
    showSystemNotice,
    updateArenaIdentity,
    updateGameMode,
    updateBotSettings,
    updateGameTimer,
    updateLobbyActions,
    updateLobbyPlayers,
    updateMatchSettings,
    updateRoundStatus,
    updateScoreboard
} from '../ui.js';
import {
    clientSession,
    renderState,
    updateRenderState
} from './state.js';

const playerNameInput = document.querySelector('#player-name');
const joinButton = document.querySelector('#join-button');
const leaveLobbyButton = document.querySelector('#leave-lobby-button');

/**
 * Applies authoritative Socket.IO responses to local UI and render state.
 */
export function registerSocketEvents(socket) {
    socket.on('JOIN_SUCCESS', ({playerId}) => {
        clientSession.currentPlayerId = playerId;
        playerNameInput.disabled = true;
        joinButton.disabled = true;
        joinButton.textContent = 'Joined';
        showJoinMessage(
            'You are connected. Waiting for the match to start.',
            'success'
        );
        updateLobbyActions(
            clientSession.lobbyPlayers,
            clientSession.currentPlayerId
        );
    });

    socket.on('JOIN_ERROR', ({code, message}) => {
        if (code === 'SINGLE_PLAYER_ACTIVE') {
            showSinglePlayerActive(message);
            return;
        }

        if (
            code === 'MATCH_IN_PROGRESS'
            || clientSession.currentGameStatus !== 'LOBBY'
        ) {
            playerNameInput.disabled = true;
            joinButton.disabled = true;
            joinButton.textContent = 'Match in progress';
            showMatchInProgress();
            return;
        }

        joinButton.disabled = false;
        showJoinMessage(message);
        playerNameInput.select();
    });

    socket.on('connect_error', error => {
        if (error.data?.code !== 'SINGLE_PLAYER_ACTIVE') return;

        showSinglePlayerActive(error.data.message);
    });

    socket.on('LEAVE_LOBBY_SUCCESS', () => {
        clientSession.currentPlayerId = null;
        playerNameInput.disabled = false;
        joinButton.disabled = false;
        joinButton.textContent = 'Enter lobby';
        leaveLobbyButton.disabled = false;
        showJoinMessage('You left the lobby.', 'success');
        updateLobbyActions(clientSession.lobbyPlayers, null);
        playerNameInput.focus();
    });

    socket.on('LEAVE_LOBBY_ERROR', ({message}) => {
        leaveLobbyButton.disabled = false;
        showJoinMessage(message);
    });

    socket.on('START_ERROR', ({message}) => showStartError(message));
    socket.on(
        'MATCH_SETTINGS_ERROR',
        ({message}) => showStartError(message)
    );
    socket.on('GAME_MODE_ERROR', ({message}) => {
        const currentPlayer = findCurrentPlayer(clientSession.lobbyPlayers);
        updateGameMode(currentPlayer, clientSession.currentGameMode);
        showStartError(message);
    });
    socket.on(
        'ROUND_ACTION_ERROR',
        ({message}) => showReturnToLobbyError(message)
    );
    socket.on(
        'RETURN_TO_LOBBY_ERROR',
        ({message}) => showReturnToLobbyError(message)
    );
    socket.on(
        'QUIT_MATCH_ERROR',
        ({message}) => showPauseMenuError(message)
    );

    socket.on('QUIT_MATCH_SUCCESS', () => {
        clientSession.currentPlayerId = null;
    });

    socket.on('HOST_CHANGED', ({message}) => {
        showHostChanged(message);
    });

    socket.on('POWERUP_AUDIO', ({cue}) => {
        if (clientSession.currentPlayerId) playPowerUpCue(cue);
    });

    socket.on('ROOM_STATE_UPDATE', players => {
        clientSession.lobbyPlayers = players;
        const currentPlayer = findCurrentPlayer(players);

        updateLobbyPlayers(
            players,
            clientSession.currentPlayerId,
            clientSession.currentGameMode
        );
        updateLobbyActions(players, clientSession.currentPlayerId);
        updateMatchSettings(
            currentPlayer,
            clientSession.currentWinsRequired
        );
        updateGameMode(currentPlayer, clientSession.currentGameMode);
        updateScoreboard(players, clientSession.currentPlayerId);
    });

    socket.on('GAME_STATE_UPDATE', gameState => {
        handleGameStateUpdate(gameState);
    });

    socket.on('BOT_SETTINGS_ERROR', ({ message }) => {
        showStartError(message);
    });
}

function handleGameStateUpdate(gameState) {
    const players = Object.values(gameState.players);
    const currentPlayer = findCurrentPlayer(players);
    const isHost = currentPlayer?.isHost === true;

    clientSession.currentGameStatus = gameState.gameStatus;
    clientSession.currentGameMode = gameState.gameMode;
    clientSession.currentWinsRequired = gameState.winsRequired;
    clientSession.currentBotConfigs = gameState.botConfigs ?? [];
    syncBotConfigDrafts(clientSession.currentBotConfigs);

    if (gameState.gameStatus === 'LOBBY') {
        updateLobbyPlayers(
            players,
            clientSession.currentPlayerId,
            gameState.gameMode
        );
    }

    updateBotSettings(currentPlayer, clientSession.currentBotConfigs);
    updateGameMode(currentPlayer, gameState.gameMode);
    updateMatchSettings(currentPlayer, gameState.winsRequired);
    updateGameTimer(gameState);
    updateRoundStatus(gameState);
    updateScoreboard(players, clientSession.currentPlayerId);
    handleGameAudio(
        gameState,
        renderState.current,
        clientSession.currentPlayerId
    );
    showNewSystemNotice(gameState.systemNotice);

    if (gameState.gameStatus !== 'LOBBY' && !currentPlayer) {
        playerNameInput.disabled = true;
        joinButton.disabled = true;
        joinButton.textContent = 'Match in progress';
        showMatchInProgress();
        return;
    }

    if (gameState.gameStatus === 'LOBBY'
        && !clientSession.currentPlayerId) {
        playerNameInput.disabled = false;
        joinButton.disabled = false;
        joinButton.textContent = 'Enter lobby';
        showJoinMessage('');
    }

    if (gameState.gameStatus === 'LOBBY'
        && gameState.gameMode === 'SINGLE_PLAYER'
        && !isHost) {
        playerNameInput.disabled = true;
        joinButton.disabled = true;
        joinButton.textContent = 'Single player mode';
        showJoinMessage('Only bots allowed in single player mode!');
    }

    updateArenaIdentity(currentPlayer);
    showScreen(gameState.gameStatus);

    if (gameState.gameStatus === 'COUNTDOWN') {
        renderCountdown(gameState.timer, currentPlayer);
    } else if (gameState.gameStatus === 'PAUSED') {
        renderPaused(gameState.pausedBy, currentPlayer);
    } else if (gameState.gameStatus === 'GAME_OVER') {
        renderRoundResult(
            gameState,
            players,
            clientSession.currentPlayerId
        );
    }

    updateRenderState(gameState);
}

function findCurrentPlayer(players) {
    return players.find(
        player => player.id === clientSession.currentPlayerId
    );
}

function showSinglePlayerActive(message) {
    playerNameInput.disabled = true;
    joinButton.disabled = true;
    joinButton.textContent = 'Single player mode';
    showJoinMessage(message);
}

function syncBotConfigDrafts(configs) {
    configs.forEach((config, index) => {
        clientSession.botConfigDrafts[index] = { ...config };
    });
}

function showNewSystemNotice(notice) {
    if (notice?.id === clientSession.lastSystemNoticeId) return;

    clientSession.lastSystemNoticeId = notice?.id ?? null;
    showSystemNotice(notice);
}
