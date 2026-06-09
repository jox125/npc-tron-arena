import { state } from './client.js';

const SERVER_TICK_MS = 1000 / 30;           // 33.3ms
const PLAYER_SIZE = 10;                     // 10px player
const PLAYER_OFFSET = PLAYER_SIZE / 2;      // converts top-left positioning to center-based positioning
const TRAIL_THICKNESS = 8;                  // matches backend collision
const TRAIL_OFFSET = TRAIL_THICKNESS / 2;   // converts top-left positioning to center-based positioning

const arena = document.querySelector('#arena');

const playerElements = {};  // { socketId: <div> }
const trailElements = {};   // { segmentId: <div> }

// --- MAIN LOOP ---

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const curr = state.current;
    const prev = state.previous;
    
    // Nothing to render
    if(!curr || !prev) return;

    // Only render player movement when playing
    // And cleanup if needed
    if(curr.gameStatus !== 'PLAYING') {
        if(Object.keys(trailElements).length > 0) {
            cleanupTrails();
        }
        if(Object.keys(playerElements).length > 0) {
            cleanupPlayers(curr.players);
        }

        return;
    }

    // Normalized time factor (0-1)
    const t = Math.min((now - state.lastUpdate) / SERVER_TICK_MS, 1);
    renderPlayers(prev, curr, t);
    renderTrails(curr.trails);
}

function startLoop() {
    requestAnimationFrame(gameLoop);
}

// --- RENDER FUNCTIONS ---

function renderPlayers(prev, curr, t) {
    const prevPlayers = prev.players || {};
    const currPlayers = curr.players || {};

    cleanupPlayers(currPlayers);

    for(const [id, player] of Object.entries(currPlayers)) {
        const prevPlayer = prevPlayers[id];
        
        // Interpolate player position
        const x = (prevPlayer && !player.teleported)
            ? lerp(prevPlayer.x, player.x, t) - PLAYER_OFFSET
            : player.x - PLAYER_OFFSET;

        const y = (prevPlayer && !player.teleported)
            ? lerp(prevPlayer.y, player.y, t) - PLAYER_OFFSET
            : player.y - PLAYER_OFFSET;

        const div = getOrCreatePlayerDiv(id, player.color);
        div.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
}

function renderTrails(trails) {
    for(const seg of trails) {
        let el = trailElements[seg.id];

        // Spawn new div if this is a new trail ID
        if(!el) {
            el = document.createElement('div');
            el.classList.add('trail-segment');
            el.style.cssText = `
                position: absolute;
                background-color: ${seg.color};
                will-change: transform;
            `;            
            arena.appendChild(el);
            trailElements[seg.id] = el;
        }
        
        // Update trail position
        const x = Math.min(seg.x1, seg.x2) - TRAIL_OFFSET;
        const y = Math.min(seg.y1, seg.y2) - TRAIL_OFFSET;
        const w = Math.abs(seg.x2 - seg.x1) + TRAIL_THICKNESS;
        const h = Math.abs(seg.y2 - seg.y1) + TRAIL_THICKNESS;

        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.width  = w + "px";
        el.style.height = h + "px";
    }
}

function cleanupTrails() {
    for(const id in trailElements) {
        trailElements[id].remove();
        delete trailElements[id];
    }
}

// --- PLAYER DIV MANAGEMENT ---

function getOrCreatePlayerDiv(id, color) {
    if(playerElements[id]) return playerElements[id];

    const div = document.createElement('div');
    div.classList.add('player-vehicle');
    div.style.cssText = `
        position: absolute;
        width: ${PLAYER_SIZE}px;
        height: ${PLAYER_SIZE}px;
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

function cleanupPlayers(currentPlayers) {
    for(const id in playerElements) {
        if(!currentPlayers[id]) {
            removePlayerDiv(id);
        }
    }
}

// Interpolation helper
function lerp(a, b, t) {
    return a + (b - a) * t;
}

export { startLoop };