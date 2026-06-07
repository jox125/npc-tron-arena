import {
    showJoinMessage,
    showScreen,
    updateLobbyPlayers,
    updateScoreboard
} from './ui.js';

import { startLoop } from './renderer.js';

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

socket.on('JOIN_SUCCESS', () => {
    playerNameInput.disabled = true;
    joinButton.disabled = true;
    joinButton.textContent = 'Joined';
    showJoinMessage('You are connected. Waiting for the match to start.', 'success');
});

socket.on('JOIN_ERROR', ({ message }) => {
    joinButton.disabled = false;
    showJoinMessage(message);
    playerNameInput.select();
});

socket.on('ROOM_STATE_UPDATE', players => {
    updateLobbyPlayers(players);
    updateScoreboard(players);
});

socket.on('GAME_STATE_UPDATE', gameState => {
    showScreen(gameState.gameStatus);
    updateScoreboard(Object.values(gameState.players));
    updateGameState(gameState);
});

// Start rAF loop
startLoop();


function updateGameState(gameState) {
    state.previous = state.current;
    state.current = gameState;
    state.lastUpdate = performance.now();
}
