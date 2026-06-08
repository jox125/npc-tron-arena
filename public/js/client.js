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
    showReturnToLobbyError,
    updateArenaIdentity,
    updateLobbyActions,
    updateLobbyPlayers,
    updateScoreboard
} from './ui.js';
import {
    playCountdownCue,
    resetCountdownAudio,
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
const returnToLobbyButton = document.querySelector('#return-to-lobby-button');
let currentPlayerId = null;
let lobbyPlayers = [];
let currentGameStatus = 'LOBBY';

// Starts WASD/Arrow key handling
startInput(socket);

document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat) {
        return;
    }

    const canTogglePause =
        currentPlayerId &&
        ['PLAYING', 'PAUSED'].includes(currentGameStatus);

    if (canTogglePause) {
        socket.emit('TOGGLE_PAUSE');
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

returnToLobbyButton.addEventListener('click', () => {
    returnToLobbyButton.disabled = true;
    socket.emit('RETURN_TO_LOBBY');
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

socket.on('START_ERROR', ({ message }) => {
    showStartError(message);
});

socket.on('RETURN_TO_LOBBY_ERROR', ({ message }) => {
    showReturnToLobbyError(message);
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
        playCountdownCue(gameState.timer);
    } else {
        resetCountdownAudio();
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
