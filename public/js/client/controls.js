import {
    preloadAudio,
    setAudioSetting,
    subscribeAudioSettings,
    unlockAudio
} from '../audio.js';
import {
    showJoinMessage,
    updateAudioControls
} from '../ui.js';
import { clientSession } from './state.js';

const joinForm = document.querySelector('#join-form');
const lobbyPlayerList = document.querySelector('#lobby-player-list');
const botHelpModal = document.querySelector('#bot-help-modal');
const botHelpCloseButton = document.querySelector('#bot-help-close');
const playerNameInput = document.querySelector('#player-name');
const joinButton = document.querySelector('#join-button');
const startGameButton = document.querySelector('#start-game-button');
const leaveLobbyButton = document.querySelector('#leave-lobby-button');
const gameModeSwitch = document.querySelector('#game-mode-switch');
const winsRequiredSelect = document.querySelector('#wins-required');
const nextRoundButton = document.querySelector('#next-round-button');
const returnToLobbyButton =
    document.querySelector('#return-to-lobby-button');
const resumeGameButton = document.querySelector('#resume-game-button');
const quitMatchButton = document.querySelector('#quit-match-button');
const audioToggleButtons =
    document.querySelectorAll('[data-audio-setting]');
const botsNumberSelect = document.querySelector('#bots-number');
let botHelpPreviousFocus = null;

/**
 * Connects browser controls to Socket.IO commands.
 */
export function registerControls(socket) {
    registerAudioControls();

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !botHelpModal.classList.contains('hidden')) {
            event.preventDefault();
            closeBotHelp();
            return;
        }

        if (event.key !== 'Escape' || event.repeat) return;

        const canPause =
            clientSession.currentPlayerId
            && clientSession.currentGameStatus === 'PLAYING';

        if (canPause) socket.emit('PAUSE_GAME');
    });

    joinForm.addEventListener('submit', event => {
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

    winsRequiredSelect.addEventListener('change', () => {
        socket.emit('UPDATE_MATCH_SETTINGS', {
            winsRequired: Number(winsRequiredSelect.value)
        });
    });

    gameModeSwitch.addEventListener('click', () => {
        const requestedGameMode =
            clientSession.currentGameMode === 'MULTIPLAYER'
                ? 'SINGLE_PLAYER'
                : 'MULTIPLAYER';

        gameModeSwitch.disabled = true;
        gameModeSwitch.setAttribute(
            'aria-pressed',
            String(requestedGameMode === 'SINGLE_PLAYER')
        );
        socket.emit('UPDATE_GAME_MODE', {
            gameMode: requestedGameMode
        });
    });

    leaveLobbyButton.addEventListener('click', () => {
        leaveLobbyButton.disabled = true;
        socket.emit('LEAVE_LOBBY');
    });

    nextRoundButton.addEventListener('click', () => {
        nextRoundButton.disabled = true;
        socket.emit('START_NEXT_ROUND');
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

    botsNumberSelect.addEventListener('change', () => {
        const opponentCount = Number(botsNumberSelect.value);
        const configs = buildBotConfigs(opponentCount);

        emitBotSettings(socket, opponentCount, configs);
    });

    lobbyPlayerList.addEventListener('change', event => {
        const select = event.target.closest('[data-bot-config-field]');
        if (!select) return;

        const botIndex = Number(select.dataset.botIndex);
        const field = select.dataset.botConfigField;
        const opponentCount = Number(botsNumberSelect.value);
        const draft = clientSession.botConfigDrafts[botIndex];

        if (!draft || !['difficulty', 'personality'].includes(field)) return;

        clientSession.botConfigDrafts[botIndex] = {
            ...draft,
            [field]: select.value
        };

        emitBotSettings(socket, opponentCount, buildBotConfigs(opponentCount));
    });

    lobbyPlayerList.addEventListener('click', event => {
        const helpButton = event.target.closest('[data-bot-help]');
        if (!helpButton) return;

        openBotHelp(helpButton);
    });

    botHelpModal.addEventListener('click', event => {
        if (!event.target.closest('[data-bot-help-close]')) return;

        closeBotHelp();
    });
}

function registerAudioControls() {
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    preloadAudio();

    subscribeAudioSettings(updateAudioControls);
    audioToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const setting = button.dataset.audioSetting;
            const enabled = button.getAttribute('aria-pressed') !== 'true';
            setAudioSetting(setting, enabled);
        });
    });
}

function buildBotConfigs(opponentCount) {
    return clientSession.botConfigDrafts.slice(0, opponentCount);
}

function emitBotSettings(socket, opponentCount, configs) {
    socket.emit('UPDATE_BOT_SETTINGS', {
        opponentCount,
        configs
    });
}

function openBotHelp(trigger) {
    botHelpPreviousFocus = trigger;
    botHelpModal.classList.remove('hidden');
    botHelpCloseButton.focus();
}

function closeBotHelp() {
    botHelpModal.classList.add('hidden');

    if (botHelpPreviousFocus?.isConnected) {
        botHelpPreviousFocus.focus();
    }

    botHelpPreviousFocus = null;
}
