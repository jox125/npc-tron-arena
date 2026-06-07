const lobbyScreen = document.querySelector('#lobby-screen');
const gameScreen = document.querySelector('#game-screen');
const overlay = document.querySelector('#overlay');
const arena = document.querySelector('#arena');
const scoreboard = document.querySelector('#scoreboard');
const playerIdentityNumber = document.querySelector('#player-identity-number');
const playerIdentityName = document.querySelector('#player-identity-name');
const lobbyPlayerList = document.querySelector('#lobby-player-list');
const scoreboardList = document.querySelector('#scoreboard-list');
const playerCount = document.querySelector('#player-count');
const joinMessage = document.querySelector('#join-message');
const lobbyActions = document.querySelector('#lobby-actions');
const startGameButton = document.querySelector('#start-game-button');
const startGameMessage = document.querySelector('#start-game-message');

export function showScreen(gameStatus) {
    lobbyScreen.classList.toggle('hidden', gameStatus !== 'LOBBY');
    gameScreen.classList.toggle('hidden', gameStatus === 'LOBBY');

    const showOverlay = ['COUNTDOWN', 'PAUSED', 'GAME_OVER']
        .includes(gameStatus);

    overlay.classList.toggle('hidden', !showOverlay);
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

export function updateLobbyActions(players, currentPlayerId) {
    const currentPlayer = players.find(player => player.id === currentPlayerId);

    lobbyActions.classList.toggle('hidden', !currentPlayer);

    if (!currentPlayer) {
        return;
    }

    const isHost = currentPlayer.playerNumber === 1;
    const canStart = isHost && players.length >= 2;

    startGameButton.classList.toggle('hidden', !isHost);
    startGameButton.disabled = !canStart;
    startGameButton.textContent = canStart ? 'Start game' : 'Waiting for players';

    if (isHost) {
        startGameMessage.textContent = canStart
            ? `${players.length} players ready.`
            : 'At least 2 players are required to start.';
    } else {
        startGameMessage.textContent = 'Waiting for P1 to start the game.';
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

    item.className = className;
    item.style.setProperty('--player-color', player.color);
    color.className = 'player-color';
    name.className = 'player-name';
    name.textContent = `P${player.playerNumber} · ${player.name}`;
    score.className = 'player-score';
    score.textContent = `${player.score ?? 0} pts`;

    item.append(color, name, score);
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
    scoreboardList.replaceChildren();

    players.forEach((player) => {
        const item = createPlayerItem(player, 'scoreboard-player');

        if (player.id === currentPlayerId) {
            item.classList.add('is-current-player');
        }

        scoreboardList.append(item);
    });
}
