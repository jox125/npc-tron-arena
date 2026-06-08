import { startLoop } from './renderer.js';
import { startInput } from './input.js';
import {
    showJoinMessage,
    showHostChanged,
    showMatchInProgress,
    showStartError,
    showScreen,
    renderCountdown,
    renderPaused,
    renderRoundResult,
    showPauseMenuError,
    showReturnToLobbyError,
    showSystemNotice,
    updateArenaIdentity,
    updateLobbyActions,
    updateLobbyPlayers,
    updateScoreboard
} from './ui.js';
import {
    handleGameAudio,
    preloadAudio,
    unlockAudio
} from './audio.js';

// Store curr, prev states for interpolation
export const state = {
    current: {},
    previous: {},
    lastUpdate: 0
};

const socket = io();
const joinForm = document.querySelector('#join-form');
const playerNameInput = document.querySelector('#player-name');
const joinButton = document.querySelector('#join-button');
const startGameButton = document.querySelector('#start-game-button');
const leaveLobbyButton = document.querySelector('#leave-lobby-button');
const returnToLobbyButton = document.querySelector('#return-to-lobby-button');
const resumeGameButton = document.querySelector('#resume-game-button');
const quitMatchButton = document.querySelector('#quit-match-button');
let currentPlayerId = null;
let lobbyPlayers = [];
let currentGameStatus = 'LOBBY';
let lastSystemNoticeId = null;

// Starts WASD/Arrow key handling
startInput(socket);

document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
preloadAudio();

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat) {
        return;
    }

    const canPause =
        currentPlayerId &&
        currentGameStatus === 'PLAYING';

    if (canPause) {
        socket.emit('PAUSE_GAME');
    }
});

joinForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = playerNameInput.value.trim();

    if (name.length < 2) {
        showJoinMessage('Name must contain at least 2 characters.');
        playerNameInput.focus();
        return;
    }

    joinButton.disabled = true;
    showJoinMessage('Connecting to lobby...', 'success');
    socket.emit('JOIN_LOBBY', { name });
});

startGameButton.addEventListener('click', () => {
    startGameButton.disabled = true;
    socket.emit('START_GAME');
});

leaveLobbyButton.addEventListener('click', () => {
    leaveLobbyButton.disabled = true;
    socket.emit('LEAVE_LOBBY');
});

returnToLobbyButton.addEventListener('click', () => {
    returnToLobbyButton.disabled = true;
    socket.emit('RETURN_TO_LOBBY');
});

resumeGameButton.addEventListener('click', () => {
    resumeGameButton.disabled = true;
    socket.emit('RESUME_GAME');
});

quitMatchButton.addEventListener('click', () => {
    quitMatchButton.disabled = true;
    socket.emit('QUIT_MATCH');
});

socket.on('JOIN_SUCCESS', ({ playerId }) => {
    currentPlayerId = playerId;
    playerNameInput.disabled = true;
    joinButton.disabled = true;
    joinButton.textContent = 'Joined';
    showJoinMessage('You are connected. Waiting for the match to start.', 'success');
    updateLobbyActions(lobbyPlayers, currentPlayerId);
});

socket.on('JOIN_ERROR', ({ code, message }) => {
    if (code === 'MATCH_IN_PROGRESS' || currentGameStatus !== 'LOBBY') {
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

socket.on('LEAVE_LOBBY_SUCCESS', () => {
    currentPlayerId = null;
    playerNameInput.disabled = false;
    joinButton.disabled = false;
    joinButton.textContent = 'Enter lobby';
    leaveLobbyButton.disabled = false;
    showJoinMessage('You left the lobby.', 'success');
    updateLobbyActions(lobbyPlayers, currentPlayerId);
    playerNameInput.focus();
});

socket.on('LEAVE_LOBBY_ERROR', ({ message }) => {
    leaveLobbyButton.disabled = false;
    showJoinMessage(message);
});

socket.on('START_ERROR', ({ message }) => {
    showStartError(message);
});

socket.on('RETURN_TO_LOBBY_ERROR', ({ message }) => {
    showReturnToLobbyError(message);
});

socket.on('QUIT_MATCH_ERROR', ({ message }) => {
    showPauseMenuError(message);
});

socket.on('QUIT_MATCH_SUCCESS', () => {
    currentPlayerId = null;
});

socket.on('HOST_CHANGED', ({ message }) => {
    showHostChanged(message);
});

socket.on('ROOM_STATE_UPDATE', players => {
    lobbyPlayers = players;
    updateLobbyPlayers(players);
    updateLobbyActions(players, currentPlayerId);
    updateScoreboard(players, currentPlayerId);
});

socket.on('GAME_STATE_UPDATE', gameState => {
    const players = Object.values(gameState.players);
    const currentPlayer = players.find(player => player.id === currentPlayerId);
    currentGameStatus = gameState.gameStatus;

    updateScoreboard(players, currentPlayerId);
    handleGameAudio(gameState, state.current, currentPlayerId);
    if (gameState.systemNotice?.id !== lastSystemNoticeId) {
        lastSystemNoticeId = gameState.systemNotice?.id ?? null;
        showSystemNotice(gameState.systemNotice);
    }

    if (gameState.gameStatus !== 'LOBBY' && !currentPlayer) {
        playerNameInput.disabled = true;
        joinButton.disabled = true;
        joinButton.textContent = 'Match in progress';
        showMatchInProgress();
        return;
    }

    if (gameState.gameStatus === 'LOBBY' && !currentPlayerId) {
        playerNameInput.disabled = false;
        joinButton.disabled = false;
        joinButton.textContent = 'Enter lobby';
        showJoinMessage('');
    }

    updateArenaIdentity(currentPlayer);
    showScreen(gameState.gameStatus);

    if (gameState.gameStatus === 'COUNTDOWN') {
        renderCountdown(gameState.timer, currentPlayer);
    }

    if (gameState.gameStatus === 'PAUSED') {
        renderPaused(gameState.pausedBy, currentPlayer);
    }

    if (gameState.gameStatus === 'GAME_OVER') {
        renderRoundResult(
            gameState.roundResult,
            players,
            currentPlayerId
        );
    }

    updateGameState(gameState);
});

// Start rAF loop
startLoop(socket);


function updateGameState(gameState) {
    state.previous = state.current;
    state.current = gameState;
    state.lastUpdate = performance.now();
}
