const lobbyPlayerList = document.querySelector('#lobby-player-list');
const scoreboardList = document.querySelector('#scoreboard-list');
const playerCount = document.querySelector('#player-count');

let lastScoreboardHash = null;

const BOT_DIFFICULTIES = Object.freeze(['EASY', 'MEDIUM', 'HARD']);
const BOT_PERSONALITIES = Object.freeze(['SURVIVOR', 'HUNTER', 'COLLECTOR']);

// Renderer uses this map to attach temporary status icons to scoreboard rows.
export const playerNodes = new Map();

export function updateLobbyPlayers(players, currentPlayerId, gameMode) {
    lobbyPlayerList.replaceChildren();
    playerCount.textContent = `${players.length} / 4`;

    if (players.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'player-list__empty';
        emptyItem.textContent = 'Waiting for players...';
        lobbyPlayerList.append(emptyItem);
        return;
    }

    const currentPlayer = players.find(player => player.id === currentPlayerId);
    const canEditBots =
        currentPlayer?.isHost === true && gameMode === 'SINGLE_PLAYER';

    players.forEach(player => {
        lobbyPlayerList.append(
            createPlayerItem(player, 'player-list__item', { canEditBots })
        );
    });
}

export function updateScoreboard(players, currentPlayerId) {
    const hash = JSON.stringify(
        players.map(player => ({
            id: player.id,
            color: player.color,
            isBot: player.isBot,
            isCurrentPlayer: player.id === currentPlayerId,
            isHost: player.isHost,
            name: player.name,
            playerNumber: player.playerNumber,
            score: player.score
        })).sort((first, second) => first.id.localeCompare(second.id))
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

function createPlayerItem(player, className, options = {}) {
    const item = document.createElement('li');
    const color = document.createElement('span');
    const name = document.createElement('span');
    const score = document.createElement('span');
    const statusIcons = document.createElement('div');

    item.className = className;
    color.className = 'player-color';
    name.className = 'player-name';
    score.className = 'player-score';
    statusIcons.className = 'player-status-icons';
    statusIcons.id = `status-${player.id}`;

    item.append(color, name, score, statusIcons);
    updatePlayerItem(item, player);

    if (className === 'player-list__item' && player.isBot) {
        item.append(createBotHelpButton(player));
        item.append(createBotConfigControls(player, options.canEditBots));
    }

    return item;
}

function updatePlayerItem(item, player) {
    const name = item.querySelector('.player-name');
    const score = item.querySelector('.player-score');

    item.classList.toggle('is-bot', player.isBot === true);
    item.style.setProperty('--player-color', player.color);
    name.textContent =
        `P${player.playerNumber} · ${player.name}`
        + `${player.isHost ? ' (Host)' : ''}`;
    score.textContent = `${player.score ?? 0} wins`;
}

function createBotHelpButton(player) {
    const button = document.createElement('button');

    button.className = 'bot-help-button';
    button.type = 'button';
    button.dataset.botHelp = 'true';
    button.setAttribute(
        'aria-label',
        `Show configuration help for ${player.name}`
    );
    button.textContent = '?';

    return button;
}

function createBotConfigControls(player, canEditBots) {
    const controls = document.createElement('div');

    controls.className = 'bot-config-controls';
    controls.append(
        createBotConfigSelect({
            botIndex: player.playerNumber - 2,
            field: 'difficulty',
            label: 'Difficulty',
            value: player.difficulty,
            options: BOT_DIFFICULTIES,
            disabled: !canEditBots
        }),
        createBotConfigSelect({
            botIndex: player.playerNumber - 2,
            field: 'personality',
            label: 'Personality',
            value: player.personality,
            options: BOT_PERSONALITIES,
            disabled: !canEditBots
        })
    );

    return controls;
}

function createBotConfigSelect({
    botIndex,
    field,
    label,
    value,
    options,
    disabled
}) {
    const wrapper = document.createElement('label');
    const labelText = document.createElement('span');
    const select = document.createElement('select');

    wrapper.className = 'bot-config-field';
    labelText.textContent = label;
    select.dataset.botConfigField = field;
    select.dataset.botIndex = String(botIndex);
    select.disabled = disabled;

    options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = formatBotOption(optionValue);
        option.selected = optionValue === value;
        select.append(option);
    });

    wrapper.append(labelText, select);
    return wrapper;
}

function formatBotOption(value) {
    return value
        .toLowerCase()
        .replace(/^\w/, letter => letter.toUpperCase());
}
