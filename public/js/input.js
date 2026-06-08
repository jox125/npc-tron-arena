import { state } from './client.js';

const GAME_KEYS = new Set(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'w', 'a', 's', 'd']);

export function startInput(socket) {
    document.addEventListener('keydown', (event) => {
        if (event.repeat) return;
        if (state.current.gameStatus !== 'PLAYING') return;

        // Prevent default behaviour only on game keys
        // So F5, Ctrl+R, etc. still work
        if(GAME_KEYS.has(event.key)) event.preventDefault();
        
        const key = event.key;
        if (key === 'ArrowUp' || key === 'w') socket.emit('PLAYER_INPUT', { turn: 'UP' });
        else if (key === 'ArrowDown' || key === 's') socket.emit('PLAYER_INPUT', { turn: 'DOWN' });
        else if (key === 'ArrowLeft' || key === 'a') socket.emit('PLAYER_INPUT', { turn: 'LEFT' });
        else if (key === 'ArrowRight' || key === 'd') socket.emit('PLAYER_INPUT', { turn: 'RIGHT' });
    });
}