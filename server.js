import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import { gameState, updateGamePhysics } from './src/gameEngine.js';
import { gameEvents } from './src/gameEvents.js';
import { createGameSession } from './src/server/gameSession.js';
import { GAME_MODES } from './src/server/gameModes.js';
import { registerSocketHandlers } from './src/server/socketHandlers.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});
const session = createGameSession(io);

// Domain modules report audio events without importing or depending on Socket.IO.
gameEvents.on('powerup-audio', event => {
    io.emit('POWERUP_AUDIO', event);
});

app.use(express.static(path.join(import.meta.dirname, 'public')));
app.use(
    '/vendor/howler',
    express.static(path.join(import.meta.dirname, 'node_modules/howler/dist'))
);

io.use((socket, next) => {
    if (gameState.gameMode === GAME_MODES.SINGLE_PLAYER) {
        const error = new Error('Single-player match is active.');
        error.data = {
            code: 'SINGLE_PLAYER_ACTIVE',
            message: 'Single-player match is active.'
        };
        next(error);
        return;
    }

    next();
});

io.on('connection', (socket) => {
    registerSocketHandlers({ io, socket, session });
});

// Only the server advances physics. Clients render the state they receive.
const TICK_RATE = 30;
setInterval(() => {
    if (gameState.gameStatus !== "PLAYING") return;
    session.updateRoundElapsedTime();
    updateGamePhysics();
    session.resolveRoundEnd();
    io.emit('GAME_STATE_UPDATE', gameState);
}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Game server running on port http://localhost:${PORT}`);
});
