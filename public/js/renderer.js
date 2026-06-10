import { state } from './client.js';

const SERVER_TICK_MS = 1000 / 30;           // 33.3ms
const PLAYER_SIZE = 10;                     // 10px player
const PLAYER_OFFSET = PLAYER_SIZE / 2;      // converts top-left positioning to center-based positioning
const TRAIL_THICKNESS = 8;                  // matches backend collision
const TRAIL_OFFSET = TRAIL_THICKNESS / 2;   // converts top-left positioning to center-based positioning
const ARENA_SIZE = 800;
const INDICATOR_RANGE = 70;
const INDICATOR_LONG_SIDE = 120;
const INDICATOR_SHORT_SIDE = 25;
const POWER_UP_ICONS = {
    GHOST:         '👻',
    FREEZE:        '❄️',
    TRAIL_ERASER:  '🧹',
    TRAIL_BREAKER: '⚡',
};

const arena = document.querySelector('#arena');

const playerElements = {};  // { socketId: <div> }
const trailElements = {};   // { segmentId: <div> }
const wrapIndicators = {};  // { playerId: <div> }
const powerUpElements = {}; // { powerUpId: <div> }

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
        if(Object.keys(trailElements).length > 0) cleanupTrails();
        if(Object.keys(playerElements).length > 0) cleanupAllPlayers();
        if(Object.keys(wrapIndicators).length > 0) cleanupIndicators();
        if(Object.keys(powerUpElements).length > 0) cleanupPowerups();
        return;
    }

    // Normalized time factor (0-1)
    const t = Math.min((now - state.lastUpdate) / SERVER_TICK_MS, 1);
    renderPlayers(prev, curr, t);
    renderTrails(prev, curr, t);
    renderWrapIndicators(curr);
    renderPowerUps(curr);
}

function startLoop() {
    requestAnimationFrame(gameLoop);
}

// --- RENDER FUNCTIONS ---

function renderPlayers(prev, curr, t) {
    const prevPlayers = prev.players || {};
    const currPlayers = curr.players || {};
    const canInterpolate = prev.gameStatus === 'PLAYING';

    cleanupPlayers(currPlayers);

    for(const [id, player] of Object.entries(currPlayers)) {
        const prevPlayer = prevPlayers[id];
        
        // Interpolate player position
        const x = (canInterpolate && prevPlayer && !player.teleported)
            ? lerp(prevPlayer.x, player.x, t) - PLAYER_OFFSET
            : player.x - PLAYER_OFFSET;

        const y = (canInterpolate && prevPlayer && !player.teleported)
            ? lerp(prevPlayer.y, player.y, t) - PLAYER_OFFSET
            : player.y - PLAYER_OFFSET;

        const div = getOrCreatePlayerDiv(id, player.color);
        div.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
}

function renderTrails(prev, curr, t) {
    const currTrails = curr.trails;
    const prevTrails = new Map(prev.trails.map(s => [s.id, s]));

    for(const seg of currTrails) {
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

        // Interpolate trail position
        const p = prevTrails.get(seg.id) || seg;

        const x1 = lerp(p.x1, seg.x1, t);
        const y1 = lerp(p.y1, seg.y1, t);
        const x2 = lerp(p.x2, seg.x2, t);
        const y2 = lerp(p.y2, seg.y2, t);
        
        // Update trail position
        const x = Math.min(x1, x2) - TRAIL_OFFSET;
        const y = Math.min(y1, y2) - TRAIL_OFFSET;
        const w = Math.abs(x2 - x1) + TRAIL_THICKNESS;
        const h = Math.abs(y2 - y1) + TRAIL_THICKNESS;

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

// --- POWERUPS ---

function renderPowerUps(curr) {
    const alive = new Set(curr.powerUps.map(p => p.id));

    // create/update powerups
    for(const p of curr.powerUps) {
        let el = powerUpElements[p.id];

        if(!el) {
            el = document.createElement('div');
            el.dataset.id = p.id;
            el.classList.add('powerup');
            el.textContent = POWER_UP_ICONS[p.type];
            el.style.cssText = `
                font-size: ${p.radius * 2}px;
                left: ${p.x}px;
                top: ${p.y}px;
            `;
            arena.appendChild(el);
            powerUpElements[p.id] = el;
        }
    }

    // Remove used powerups
    for(const id in powerUpElements) {
        if(!alive.has(id)) removePowerUp(id);
    }
}

function removePowerUp(id) {
    if(!powerUpElements[id]) return;
    powerUpElements[id].remove();
    delete powerUpElements[id];
}

function cleanupPowerups() {
    for(const id in powerUpElements) {
        removePowerUp(id);
    }
}

// --- WRAP INDICATORS ---

function renderWrapIndicators(curr) {
    const players = curr.players || {};

    for(const [id, player] of Object.entries(players)) {
        let el = wrapIndicators[id];

        if(!el) {
            el = document.createElement('div');
            el.classList.add('wrap-indicator');
            arena.appendChild(el);
            wrapIndicators[id] = el;
        }

        // Find distance to edge
        const distLeft = player.x;
        const distTop = player.y;
        const distRight = ARENA_SIZE - player.x;
        const distBottom = ARENA_SIZE - player.y;

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        
        if(minDist > INDICATOR_RANGE) el.style.opacity = 0;

        const intensity = 1 - (minDist / INDICATOR_RANGE);
        const rgbColor = hexToRgb(player.color);

        let x = 0;
        let y = 0;
        let w = 0;
        let h = 0;
        let gradient = "";

        // Center indicator on player
        let x_offset = player.x - 50;
        let y_offset = player.y - 50;
        
        // Opposite edge warning
        if(minDist === distLeft) {
            x = ARENA_SIZE - INDICATOR_SHORT_SIDE;
            y = y_offset;
            w = INDICATOR_SHORT_SIDE;
            h = INDICATOR_LONG_SIDE;
            gradient = `linear-gradient(to left, rgba(${rgbColor}, 0.3), transparent)`;
        } else if(minDist === distRight) {
            x = 0;
            y = y_offset;
            w = INDICATOR_SHORT_SIDE;
            h = INDICATOR_LONG_SIDE;
            gradient = `linear-gradient(to right, rgba(${rgbColor}, 0.3), transparent)`;
        } else if(minDist === distTop) {
            x = x_offset;
            y = ARENA_SIZE - INDICATOR_SHORT_SIDE;
            w = INDICATOR_LONG_SIDE;
            h = INDICATOR_SHORT_SIDE;
            gradient = `linear-gradient(to top, rgba(${rgbColor}, 0.3), transparent)`;
        } else {
            x = x_offset;
            y = 0;
            w = INDICATOR_LONG_SIDE;
            h = INDICATOR_SHORT_SIDE;
            gradient = `linear-gradient(to bottom, rgba(${rgbColor}, 0.3), transparent)`;
        }

        el.style.cssText = `
            width: ${w}px;
            height: ${h}px;
            left: ${x}px;
            top: ${y}px;
            opacity: ${intensity};
            background: ${gradient};
        `;
    }

    cleanupIndicators(players);
}

function cleanupIndicators(currentPlayers = {}) {
    for (const id in wrapIndicators) {
        if (!currentPlayers[id]) {
            wrapIndicators[id].remove();
            delete wrapIndicators[id];
        }
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

function cleanupAllPlayers() {
    for(const id in playerElements) {
        removePlayerDiv(id);
    }
}

// Interpolation helper
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');

    const bigint = parseInt(hex, 16);

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `${r}, ${g}, ${b}`;
}

export { startLoop };
