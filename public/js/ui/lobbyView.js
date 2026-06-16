import { formatDuration } from './resultView.js';

const lobbyActions = document.querySelector('#lobby-actions');
const startGameButton = document.querySelector('#start-game-button');
const leaveLobbyButton = document.querySelector('#leave-lobby-button');
const startGameMessage = document.querySelector('#start-game-message');
const gameModeSwitch = document.querySelector('#game-mode-switch');
const winsRequiredSelect = document.querySelector('#wins-required');
const roundStatus = document.querySelector('#round-status');
const gameTimerNumber = document.querySelector('#game-timer-number');
const lobbyModeText = document.querySelector('#lobby-mode-text');

let lastRoundStatus = null;
let lastWinsRequired = null;
let lastIsHost = null;
let lastGameTimerText = null;

export function updateMatchSettings(currentPlayer, winsRequired) {
    const isHost = currentPlayer?.isHost === true;
    if (
        winsRequired === lastWinsRequired
        && isHost === lastIsHost
    ) {
        return;
    }

    lastWinsRequired = winsRequired;
    lastIsHost = isHost;
    winsRequiredSelect.value = String(winsRequired);
    winsRequiredSelect.disabled = !isHost;
}

export function updateGameMode(currentPlayer, gameMode) {
    const isHost = currentPlayer?.isHost === true;
    const isSinglePlayer = gameMode === 'SINGLE_PLAYER';

    gameModeSwitch.disabled = !isHost;
    gameModeSwitch.setAttribute('aria-pressed', String(isSinglePlayer));
    gameModeSwitch.setAttribute(
        'aria-label',
        isSinglePlayer
            ? 'Switch to multiplayer mode'
            : 'Switch to single-player mode'
    );
    lobbyModeText.textContent = isSinglePlayer
        ? 'Single-player lobby'
        : 'Lobby online';
}

export function updateRoundStatus(gameState) {
    const text =
        `Round ${gameState.roundNumber} // `
        + `First to ${gameState.winsRequired} wins`;

    if (text === lastRoundStatus) return;

    lastRoundStatus = text;
    roundStatus.textContent = text;
}

export function updateGameTimer(gameState) {
    const elapsedMs = gameState.gameStatus === 'GAME_OVER'
        ? gameState.roundResult?.durationMs
        : gameState.roundElapsedMs;
    const text = formatDuration(elapsedMs);

    if (text === lastGameTimerText) return;

    lastGameTimerText = text;
    gameTimerNumber.textContent = text;
}

/**
 * Shows host-only controls and explains why a match can or cannot start.
 */
export function updateLobbyActions(players, currentPlayerId) {
    const currentPlayer = players.find(
        player => player.id === currentPlayerId
    );

    lobbyActions.classList.toggle('hidden', !currentPlayer);
    if (!currentPlayer) return;

    const isHost = currentPlayer.isHost === true;
    const canStart = isHost && players.length >= 2;

    leaveLobbyButton.disabled = false;
    startGameButton.classList.toggle('hidden', !isHost);
    startGameButton.disabled = !canStart;
    startGameButton.textContent =
        canStart ? 'Start game' : 'Waiting for players';

    if (isHost) {
        startGameMessage.textContent = canStart
            ? `${players.length} players ready.`
            : 'At least 2 players are required to start.';
    } else {
        startGameMessage.textContent =
            'Waiting for the room host to start the game.';
    }

    startGameMessage.classList.remove('error', 'notice');
}

export function showStartError(message) {
    startGameButton.disabled = false;
    startGameMessage.textContent = message;
    startGameMessage.classList.remove('notice');
    startGameMessage.classList.add('error');
}

export function showHostChanged(message) {
    startGameMessage.textContent = message;
    startGameMessage.classList.remove('error');
    startGameMessage.classList.add('notice');
}
