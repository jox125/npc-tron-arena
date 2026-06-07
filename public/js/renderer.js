import { state } from './client.js';

const SERVER_TICK_MS = 1000 / 30; // 33.3ms
const arena = document.querySelector('#arena');

const playerElements = {}; // { socketId: <div> }

// --- MAIN LOOP ---

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const curr = state.current;
    const prev = state.previous;
    
    // Nothing to render
    if(!curr || !prev) return;

    // Only render player movement during gameplay
    if(curr.gameStatus !== 'PLAYING') return;

    // Normalized time factor (0-1)
    const t = Math.min((now - state.lastUpdate) / SERVER_TICK_MS, 1);
    renderPlayers(prev, curr, t);
}

function startLoop() {
    requestAnimationFrame(gameLoop);
}

// --- RENDER FUNCTIONS ---

function renderPlayers(prev, curr, t) {
    const prevPlayers = prev.players || {};
    const currPlayers = curr.players || {};

    cleanupDisconnectedPlayers(currPlayers);

    for(const [id, player] of Object.entries(currPlayers)) {
        const prevPlayer = prevPlayers[id];
        
        // Interpolate player position
        const x = prevPlayer
            ? prevPlayer.x + (player.x - prevPlayer.x) * t
            : player.x;

        const y = prevPlayer
            ? prevPlayer.y + (player.y - prevPlayer.y) * t
            : player.y;

        const div = getOrCreatePlayerDiv(id, player.color);
        div.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
}

// --- PLAYER DIV MANAGEMENT ---

function getOrCreatePlayerDiv(id, color) {
    if(playerElements[id]) return playerElements[id];

    const div = document.createElement('div');
    div.classList.add('player-vehicle');
    div.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: ${color};
        will-change: transform;
    `;
    arena.appendChild(div);
    playerElements[id] = div;
    return div;
}

function removePlayerDiv(id) {
    if(!playerElements[id]) return;
    playerElements[id].remove();
    delete playerElements[id];
}

function cleanupDisconnectedPlayers(currentPlayers) {
    for(const id in playerElements) {
        if(!currentPlayers[id]) {
            removePlayerDiv(id);
        }
    }
}

export { startLoop };