const overlay = document.querySelector('#overlay');
const winnerCelebration = document.querySelector('#winner-celebration');
const roundResultContent =
    document.querySelector('#round-result-content');
const roundResultLabel = document.querySelector('#round-result-label');
const roundResultTitle = document.querySelector('#round-result-title');
const roundWinner = document.querySelector('#round-winner');
const roundTime = document.querySelector('#round-time');
const roundRankings = document.querySelector('#round-rankings');
const nextRoundButton = document.querySelector('#next-round-button');
const returnToLobbyButton =
    document.querySelector('#return-to-lobby-button');
const returnToLobbyMessage =
    document.querySelector('#return-to-lobby-message');
let autoReturnMessageTimer = null;

/**
 * Renders both round results and final match results from one server payload.
 */
export function renderRoundResult(gameState, players, currentPlayerId) {
    const roundResult = gameState.roundResult;
    const rankings = roundResult?.rankings ?? [];
    const winner = findPlayer(
        roundResult?.winnerId,
        players,
        rankings
    );
    const matchWinner = findPlayer(
        gameState.matchWinnerId,
        players,
        rankings
    );
    const currentPlayer = findPlayer(
        currentPlayerId,
        players,
        rankings
    );
    const isMatchOver = roundResult?.isMatchOver === true;
    const isPersonalWin =
        isMatchOver && gameState.matchWinnerId === currentPlayerId;

    roundResultContent.classList.toggle(
        'is-personal-win',
        isPersonalWin
    );
    restartWinnerCelebration(isPersonalWin);

    roundResultLabel.textContent = getResultLabel(
        gameState,
        isMatchOver,
        isPersonalWin
    );
    roundResultTitle.textContent = getResultTitle({
        isPersonalWin,
        matchWinner,
        winner,
        roundResult
    });
    roundWinner.textContent = getWinnerSummary({
        matchWinner,
        winner,
        roundResult,
        winsRequired: gameState.winsRequired
    });
    roundTime.textContent = roundResult
        ? `Round time // ${formatDuration(roundResult.durationMs)}`
        : '';

    const accentPlayer = matchWinner ?? winner;
    if (accentPlayer?.color) {
        overlay.style.setProperty('--overlay-color', accentPlayer.color);
    }

    renderRankings(rankings);
    updateResultActions({
        currentPlayer,
        isMatchOver,
        playerCount: players.length,
        resultAutoReturnAt: gameState.resultAutoReturnAt
    });
}

export function showReturnToLobbyError(message) {
    nextRoundButton.disabled = false;
    returnToLobbyButton.disabled = false;
    returnToLobbyMessage.textContent = message;
    returnToLobbyMessage.classList.add('error');
}

export function formatDuration(durationMs = 0) {
    const totalSeconds = Math.floor(
        Math.max(0, durationMs ?? 0) / 1000
    );
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:`
        + `${String(seconds).padStart(2, '0')}`;
}

function findPlayer(id, players, rankings) {
    return players.find(player => player.id === id)
        ?? rankings.find(player => player.id === id);
}

function restartWinnerCelebration(isPersonalWin) {
    winnerCelebration.classList.remove('is-active');
    if (!isPersonalWin) return;

    void winnerCelebration.offsetWidth;
    winnerCelebration.classList.add('is-active');
}

function getResultLabel(gameState, isMatchOver, isPersonalWin) {
    if (!isMatchOver) return `Round ${gameState.roundNumber} complete`;
    if (isPersonalWin) {
        return `Victory // ${gameState.roundNumber} rounds`;
    }
    return `Match complete // ${gameState.roundNumber} rounds`;
}

function getResultTitle({
    isPersonalWin,
    matchWinner,
    winner,
    roundResult
}) {
    if (isPersonalWin) return 'You win';
    if (matchWinner) return `${matchWinner.name} wins the match`;
    if (winner) return `${winner.name} wins the round`;
    return roundResult ? 'Round draw' : 'Round results';
}

function getWinnerSummary({
    matchWinner,
    winner,
    roundResult,
    winsRequired
}) {
    if (matchWinner) {
        return `P${matchWinner.playerNumber} reached ${winsRequired} wins`;
    }
    if (winner) return `P${winner.playerNumber} secured the grid`;
    return roundResult
        ? 'No light cycle survived'
        : 'Waiting for the final standings';
}

function renderRankings(rankings) {
    roundRankings.replaceChildren();

    rankings.forEach(player => {
        const item = document.createElement('li');
        const placement = document.createElement('span');
        const identity = document.createElement('span');
        const score = document.createElement('span');

        item.className = 'result-rankings__item';
        item.style.setProperty('--player-color', player.color);
        placement.className = 'result-rankings__placement';
        placement.textContent = String(player.placement);
        identity.className = 'result-rankings__identity';
        identity.textContent =
            `P${player.playerNumber} // ${player.name}`;
        score.className = 'result-rankings__score';
        score.textContent = `${player.score ?? 0} wins`;

        item.append(placement, identity, score);
        roundRankings.append(item);
    });
}

function updateResultActions({
    currentPlayer,
    isMatchOver,
    playerCount,
    resultAutoReturnAt
}) {
    const isHost = currentPlayer?.isHost === true;
    const canStartNextRound = !isMatchOver && playerCount >= 2;
    const autoReturnAt = Number(resultAutoReturnAt ?? 0);

    nextRoundButton.classList.toggle(
        'hidden',
        !isHost || !canStartNextRound
    );
    returnToLobbyButton.classList.toggle(
        'hidden',
        !isHost || canStartNextRound
    );
    nextRoundButton.disabled = false;
    returnToLobbyButton.disabled = false;
    returnToLobbyMessage.classList.remove('error');
    clearAutoReturnMessageTimer();

    const updateMessage = () => {
        returnToLobbyMessage.textContent = getResultActionMessage({
            autoReturnAt,
            canStartNextRound,
            isHost,
            isMatchOver
        });
    };
    updateMessage();

    if (autoReturnAt > Date.now()) {
        autoReturnMessageTimer = setInterval(updateMessage, 1000);
    }
}

function getResultActionMessage({
    autoReturnAt,
    canStartNextRound,
    isHost,
    isMatchOver
}) {
    const autoReturnNotice = getAutoReturnNotice(autoReturnAt);
    let message;
    if (isHost) {
        message = canStartNextRound
            ? 'Start the next round when everyone is ready.'
            : isMatchOver
                ? 'Return everyone to the lobby when the results are reviewed.'
                : 'Not enough players remain. Return to the lobby to continue.';
        return `${message}${autoReturnNotice}`;
    }

    message = canStartNextRound
        ? 'Waiting for the room host to start the next round.'
        : isMatchOver
            ? 'Waiting for the room host to return everyone to the lobby.'
            : 'Not enough players remain. Waiting for the room host.';
    return `${message}${autoReturnNotice}`;
}

function getAutoReturnNotice(autoReturnAt) {
    if (!autoReturnAt) return '';

    const secondsRemaining = Math.max(
        0,
        Math.ceil((autoReturnAt - Date.now()) / 1000)
    );

    if (secondsRemaining === 0) {
        clearAutoReturnMessageTimer();
        return ' Returning to lobby now.';
    }

    return ` Auto-return in ${secondsRemaining}s.`;
}

function clearAutoReturnMessageTimer() {
    if (!autoReturnMessageTimer) return;

    clearInterval(autoReturnMessageTimer);
    autoReturnMessageTimer = null;
}
