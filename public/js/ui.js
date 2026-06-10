const lobbyScreen = document.querySelector('#lobby-screen');
const gameScreen = document.querySelector('#game-screen');
const overlay = document.querySelector('#overlay');
const winnerCelebration = document.querySelector('#winner-celebration');
const arena = document.querySelector('#arena');
const scoreboard = document.querySelector('#scoreboard');
const playerIdentityNumber = document.querySelector('#player-identity-number');
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
const roundResultContent = document.querySelector('#round-result-content');
const roundResultLabel = document.querySelector('#round-result-label');
const roundResultTitle = document.querySelector('#round-result-title');
const roundWinner = document.querySelector('#round-winner');
const roundRankings = document.querySelector('#round-rankings');
const nextRoundButton = document.querySelector('#next-round-button');
const returnToLobbyButton = document.querySelector('#return-to-lobby-button');
const returnToLobbyMessage = document.querySelector('#return-to-lobby-message');
const lobbyPlayerList = document.querySelector('#lobby-player-list');
const scoreboardList = document.querySelector('#scoreboard-list');
const playerCount = document.querySelector('#player-count');
const joinMessage = document.querySelector('#join-message');
const lobbyActions = document.querySelector('#lobby-actions');
const startGameButton = document.querySelector('#start-game-button');
const leaveLobbyButton = document.querySelector('#leave-lobby-button');
const startGameMessage = document.querySelector('#start-game-message');
const winsRequiredSelect = document.querySelector('#wins-required');
const roundStatus = document.querySelector('#round-status');
const systemNotice = document.querySelector('#system-notice');
let systemNoticeTimeout = null;

export const playerNodes = new Map();

export function showScreen(gameStatus) {
    lobbyScreen.classList.toggle('hidden', gameStatus !== 'LOBBY');
    gameScreen.classList.toggle('hidden', gameStatus === 'LOBBY');

    if (gameStatus !== 'GAME_OVER') {
        winnerCelebration.classList.remove('is-active');
        roundResultContent.classList.remove('is-personal-win');
    }

    const showOverlay = ['COUNTDOWN', 'PAUSED', 'GAME_OVER']
        .includes(gameStatus);

    overlay.classList.toggle('hidden', !showOverlay);
    countdownContent.classList.toggle('hidden', gameStatus !== 'COUNTDOWN');
    pausedContent.classList.toggle('hidden', gameStatus !== 'PAUSED');
    roundResultContent.classList.toggle('hidden', gameStatus !== 'GAME_OVER');
}

export function showJoinMessage(message, type = 'error') {
    joinMessage.textContent = message;
    joinMessage.classList.toggle('success', type === 'success');
}

export function showMatchInProgress() {
    lobbyScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    overlay.classList.add('hidden');
    joinMessage.textContent = 'A match is currently in progress. Wait for the next lobby.';
    joinMessage.classList.remove('success');
}

export function updateArenaIdentity(player) {
    if (!player) {
        return;
    }

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
    if (!player) {
        return;
    }

    const isLaunch = timer === 0;

    overlay.style.setProperty('--overlay-color', player.color);
    countdownPlayer.textContent =
        `Player ${player.playerNumber} // ${player.name}, get ready`;
    countdownNumber.textContent = isLaunch ? '' : String(timer);
    countdownNumber.classList.toggle('hidden', isLaunch);
    countdownNumber.classList.remove('is-ticking');
    countdownCycle.classList.remove('is-riding');

    if (isLaunch) {
        // Force a reflow so the launch animation restarts for each round.
        void countdownCycle.offsetWidth;
        countdownCycle.classList.add('is-riding');
        return;
    }

    // Force a reflow so the number animation restarts for every countdown tick.
    void countdownNumber.offsetWidth;
    countdownNumber.classList.add('is-ticking');
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
    systemNotice.style.setProperty('--notice-color', notice.actor?.color ?? 'var(--cyan)');
    systemNotice.classList.remove('hidden');

    systemNoticeTimeout = setTimeout(() => {
        systemNotice.classList.add('hidden');
    }, 3200);
}

export function renderRoundResult(gameState, players, currentPlayerId) {
    const roundResult = gameState.roundResult;
    const rankings = roundResult?.rankings ?? [];
    const winner = players.find(player => player.id === roundResult?.winnerId)
        ?? rankings.find(player => player.id === roundResult?.winnerId);
    const matchWinner = players.find(player => player.id === gameState.matchWinnerId)
        ?? rankings.find(player => player.id === gameState.matchWinnerId);
    const currentPlayer = players.find(player => player.id === currentPlayerId)
        ?? rankings.find(player => player.id === currentPlayerId);
    const isMatchOver = roundResult?.isMatchOver === true;
    const isPersonalWin = isMatchOver && gameState.matchWinnerId === currentPlayerId;

    roundResultContent.classList.toggle('is-personal-win', isPersonalWin);
    winnerCelebration.classList.remove('is-active');
    if (isPersonalWin) {
        // Force a reflow so the celebration restarts for a later match win.
        void winnerCelebration.offsetWidth;
        winnerCelebration.classList.add('is-active');
    }

    roundResultLabel.textContent = isMatchOver
        ? isPersonalWin
            ? `Victory // ${gameState.roundNumber} rounds`
            : `Match complete // ${gameState.roundNumber} rounds`
        : `Round ${gameState.roundNumber} complete`;
    roundResultTitle.textContent = isPersonalWin
        ? 'You win'
        : matchWinner
        ? `${matchWinner.name} wins the match`
        : winner
            ? `${winner.name} wins the round`
            : roundResult ? 'Round draw' : 'Round results';
    roundWinner.textContent = matchWinner
        ? `P${matchWinner.playerNumber} reached ${gameState.winsRequired} wins`
        : winner
            ? `P${winner.playerNumber} secured the grid`
            : roundResult ? 'No light cycle survived' : 'Waiting for the final standings';

    const accentPlayer = matchWinner ?? winner;
    if (accentPlayer?.color) {
        overlay.style.setProperty('--overlay-color', accentPlayer.color);
    }

    roundRankings.replaceChildren();

    rankings.forEach((player) => {
        const item = document.createElement('li');
        const placement = document.createElement('span');
        const identity = document.createElement('span');
        const score = document.createElement('span');

        item.className = 'result-rankings__item';
        item.style.setProperty('--player-color', player.color);
        placement.className = 'result-rankings__placement';
        placement.textContent = String(player.placement);
        identity.className = 'result-rankings__identity';
        identity.textContent = `P${player.playerNumber} // ${player.name}`;
        score.className = 'result-rankings__score';
        score.textContent = `${player.score ?? 0} wins`;

        item.append(placement, identity, score);
        roundRankings.append(item);
    });

    const isHost = currentPlayer?.isHost === true;
    const canStartNextRound = !isMatchOver && players.length >= 2;
    nextRoundButton.classList.toggle('hidden', !isHost || !canStartNextRound);
    returnToLobbyButton.classList.toggle('hidden', !isHost || canStartNextRound);
    nextRoundButton.disabled = false;
    returnToLobbyButton.disabled = false;
    returnToLobbyMessage.classList.remove('error');
    if (isHost) {
        returnToLobbyMessage.textContent = canStartNextRound
            ? 'Start the next round when everyone is ready.'
            : isMatchOver
            ? 'Return everyone to the lobby when the results are reviewed.'
            : 'Not enough players remain. Return to the lobby to continue.';
    } else {
        returnToLobbyMessage.textContent = canStartNextRound
            ? 'Waiting for the room host to start the next round.'
            : isMatchOver
            ? 'Waiting for the room host to return everyone to the lobby.'
            : 'Not enough players remain. Waiting for the room host.';
    }
}

export function showReturnToLobbyError(message) {
    nextRoundButton.disabled = false;
    returnToLobbyButton.disabled = false;
    returnToLobbyMessage.textContent = message;
    returnToLobbyMessage.classList.add('error');
}

export function updateMatchSettings(currentPlayer, winsRequired) {
    winsRequiredSelect.value = String(winsRequired);
    winsRequiredSelect.disabled = currentPlayer?.isHost !== true;
}

export function updateRoundStatus(gameState) {
    roundStatus.textContent =
        `Round ${gameState.roundNumber} // First to ${gameState.winsRequired} wins`;
}

export function updateLobbyActions(players, currentPlayerId) {
    const currentPlayer = players.find(player => player.id === currentPlayerId);

    lobbyActions.classList.toggle('hidden', !currentPlayer);

    if (!currentPlayer) {
        return;
    }

    const isHost = currentPlayer.isHost === true;
    const canStart = isHost && players.length >= 2;

    leaveLobbyButton.disabled = false;
    startGameButton.classList.toggle('hidden', !isHost);
    startGameButton.disabled = !canStart;
    startGameButton.textContent = canStart ? 'Start game' : 'Waiting for players';

    if (isHost) {
        startGameMessage.textContent = canStart
            ? `${players.length} players ready.`
            : 'At least 2 players are required to start.';
    } else {
        startGameMessage.textContent = 'Waiting for the room host to start the game.';
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

function createPlayerItem(player, className) {
    const item = document.createElement('li');
    const color = document.createElement('span');
    const name = document.createElement('span');
    const score = document.createElement('span');
    const statusIcons = document.createElement('div');

    item.className = className;
    item.style.setProperty('--player-color', player.color);
    color.className = 'player-color';
    name.className = 'player-name';
    name.textContent =
        `P${player.playerNumber} · ${player.name}${player.isHost ? ' (Host)' : ''}`;
    score.className = 'player-score';
    score.textContent = `${player.score ?? 0} wins`;
    statusIcons.className = 'player-status-icons';
    statusIcons.id = `status-${player.id}`;

    item.append(color, name, score, statusIcons);
    return item;
}

export function updateLobbyPlayers(players) {
    lobbyPlayerList.replaceChildren();
    playerCount.textContent = `${players.length} / 4`;

    if (players.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'player-list__empty';
        emptyItem.textContent = 'Waiting for players...';
        lobbyPlayerList.append(emptyItem);
        return;
    }

    players.forEach((player) => {
        lobbyPlayerList.append(createPlayerItem(player, 'player-list__item'));
    });
}

export function updateScoreboard(players, currentPlayerId) {
    const activePlayers = new Set();

    for(const player of players) {
        let item = playerNodes.get(player.id);
        activePlayers.add(player.id);
        
        if(!item) {
            item = createPlayerItem(player, 'scoreboard-player');
            playerNodes.set(player.id, item);
            scoreboardList.appendChild(item);
        } else {
            updatePlayerItem(item, player);
        }

        if (player.id === currentPlayerId) {
            item.classList.add('is-current-player');
        }
    }

    for(const [id, node] of playerNodes) {
        if(!activePlayers.has(id)) {
            node.remove();
            playerNodes.delete(id);
        }
    }
}

function updatePlayerItem(item, player) {
    const score = item.querySelector('.player-score');
    score.textContent = `${player.score ?? 0} wins`;
}