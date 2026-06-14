const lobbyPlayerList = document.querySelector('#lobby-player-list');
const scoreboardList = document.querySelector('#scoreboard-list');
const playerCount = document.querySelector('#player-count');

let lastScoreboardHash = null;

// Renderer uses this map to attach temporary status icons to scoreboard rows.
export const playerNodes = new Map();

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

    players.forEach(player => {
        lobbyPlayerList.append(
            createPlayerItem(player, 'player-list__item')
        );
    });
}

export function updateScoreboard(players, currentPlayerId) {
    const hash = JSON.stringify(
        players.map(player => ({
            id: player.id,
            score: player.score
        }))
    );

    if (hash === lastScoreboardHash) return;
    lastScoreboardHash = hash;

    const activePlayers = new Set();

    players.forEach(player => {
        let item = playerNodes.get(player.id);
        activePlayers.add(player.id);

        if (!item) {
            item = createPlayerItem(player, 'scoreboard-player');
            playerNodes.set(player.id, item);
            scoreboardList.appendChild(item);
        } else {
            updatePlayerItem(item, player);
        }

        item.classList.toggle(
            'is-current-player',
            player.id === currentPlayerId
        );
    });

    playerNodes.forEach((node, id) => {
        if (activePlayers.has(id)) return;
        node.remove();
        playerNodes.delete(id);
    });
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
        `P${player.playerNumber} · ${player.name}`
        + `${player.isHost ? ' (Host)' : ''}`;
    score.className = 'player-score';
    score.textContent = `${player.score ?? 0} wins`;
    statusIcons.className = 'player-status-icons';
    statusIcons.id = `status-${player.id}`;

    item.append(color, name, score, statusIcons);
    return item;
}

function updatePlayerItem(item, player) {
    const score = item.querySelector('.player-score');
    score.textContent = `${player.score ?? 0} wins`;
}
