const lobbyScreen = document.querySelector('#lobby-screen');
const gameScreen = document.querySelector('#game-screen');
const overlay = document.querySelector('#overlay');
const lobbyPlayerList = document.querySelector('#lobby-player-list');
const scoreboardList = document.querySelector('#scoreboard-list');
const playerCount = document.querySelector('#player-count');
const joinMessage = document.querySelector('#join-message');

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

export function updateScoreboard(players) {
    scoreboardList.replaceChildren();

    players.forEach((player) => {
        scoreboardList.append(createPlayerItem(player, 'scoreboard-player'));
    });
}
