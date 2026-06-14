const lobbyScreen = document.querySelector('#lobby-screen');
const gameScreen = document.querySelector('#game-screen');
const overlay = document.querySelector('#overlay');
const winnerCelebration = document.querySelector('#winner-celebration');
const arena = document.querySelector('#arena');
const scoreboard = document.querySelector('#scoreboard');
const playerIdentityNumber =
    document.querySelector('#player-identity-number');
const playerIdentityName = document.querySelector('#player-identity-name');
const countdownContent = document.querySelector('#countdown-content');
const countdownPlayer = document.querySelector('#countdown-player');
const countdownNumber = document.querySelector('#countdown-number');
const countdownCycle = document.querySelector('#countdown-cycle');
const pausedContent = document.querySelector('#paused-content');
const pausedBy = document.querySelector('#paused-by');
const resumeGameButton = document.querySelector('#resume-game-button');
const quitMatchButton = document.querySelector('#quit-match-button');
const pauseMenuMessage = document.querySelector('#pause-menu-message');
const roundResultContent =
    document.querySelector('#round-result-content');
const joinMessage = document.querySelector('#join-message');
const systemNotice = document.querySelector('#system-notice');

let systemNoticeTimeout = null;
let lastShownStatus = null;
let lastCountdownTimer = null;

/**
 * Switches between lobby, game and overlay sections for a server game status.
 */
export function showScreen(gameStatus) {
    if (gameStatus === lastShownStatus) return;
    lastShownStatus = gameStatus;

    lobbyScreen.classList.toggle('hidden', gameStatus !== 'LOBBY');
    gameScreen.classList.toggle('hidden', gameStatus === 'LOBBY');

    if (gameStatus !== 'GAME_OVER') {
        winnerCelebration.classList.remove('is-active');
        roundResultContent.classList.remove('is-personal-win');
    }

    const showOverlay = ['COUNTDOWN', 'PAUSED', 'GAME_OVER']
        .includes(gameStatus);

    overlay.classList.toggle('hidden', !showOverlay);
    countdownContent.classList.toggle(
        'hidden',
        gameStatus !== 'COUNTDOWN'
    );
    pausedContent.classList.toggle('hidden', gameStatus !== 'PAUSED');
    roundResultContent.classList.toggle(
        'hidden',
        gameStatus !== 'GAME_OVER'
    );

    if (gameStatus !== 'COUNTDOWN') {
        countdownCycle.classList.remove('is-riding');
        lastCountdownTimer = null;
    }
}

export function showJoinMessage(message, type = 'error') {
    joinMessage.textContent = message;
    joinMessage.classList.toggle('success', type === 'success');
}

export function showMatchInProgress() {
    lobbyScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    overlay.classList.add('hidden');
    showJoinMessage(
        'A match is currently in progress. Wait for the next lobby.'
    );
}

export function updateArenaIdentity(player) {
    if (!player) return;

    if (arena.dataset.playerColor !== player.color) {
        arena.dataset.playerColor = player.color;
        arena.style.setProperty('--arena-color', player.color);
        scoreboard.style.setProperty('--identity-color', player.color);
    }

    playerIdentityNumber.textContent = `P${player.playerNumber}`;
    playerIdentityName.textContent = player.name;
    arena.setAttribute(
        'aria-label',
        `Game arena. You are P${player.playerNumber}, ${player.name}.`
    );
}

export function renderCountdown(timer, player) {
    if (!player) return;

    const isLaunch = timer === 0;

    overlay.style.setProperty('--overlay-color', player.color);
    countdownPlayer.textContent =
        `Player ${player.playerNumber} // ${player.name}, get ready`;
    countdownNumber.textContent = isLaunch ? '' : String(timer);
    countdownNumber.classList.toggle('hidden', isLaunch);
    countdownNumber.classList.remove('is-ticking');

    if (timer === 3 && lastCountdownTimer !== 3) {
        countdownCycle.classList.remove('is-riding');
        // Reading offsetWidth restarts the CSS animation for a new round.
        void countdownCycle.offsetWidth;
        countdownCycle.classList.add('is-riding');
    }

    if (!isLaunch) {
        void countdownNumber.offsetWidth;
        countdownNumber.classList.add('is-ticking');
    }

    lastCountdownTimer = timer;
}

export function renderPaused(pauser, currentPlayer) {
    const accentPlayer = pauser || currentPlayer;

    if (accentPlayer?.color) {
        overlay.style.setProperty('--overlay-color', accentPlayer.color);
    }

    pausedBy.textContent = pauser
        ? `Paused by P${pauser.playerNumber} // ${pauser.name}`
        : 'The match has been paused';
    resumeGameButton.disabled = false;
    quitMatchButton.disabled = false;
    pauseMenuMessage.textContent = 'Resume when all players are ready';
    pauseMenuMessage.classList.remove('error');
}

export function showPauseMenuError(message) {
    resumeGameButton.disabled = false;
    quitMatchButton.disabled = false;
    pauseMenuMessage.textContent = message;
    pauseMenuMessage.classList.add('error');
}

export function showSystemNotice(notice) {
    if (!notice || Date.now() - notice.createdAt > 5000) return;

    clearTimeout(systemNoticeTimeout);
    systemNotice.textContent = notice.message;
    systemNotice.style.setProperty(
        '--notice-color',
        notice.actor?.color ?? 'var(--cyan)'
    );
    systemNotice.classList.remove('hidden');

    systemNoticeTimeout = setTimeout(() => {
        systemNotice.classList.add('hidden');
    }, 3200);
}
