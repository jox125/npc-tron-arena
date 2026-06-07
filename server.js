import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import { gameState, updateGamePhysics, ARENA_WIDTH, ARENA_HEIGHT, getNextPlayerNumber } from './src/gameEngine.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(import.meta.dirname, 'public')));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // 1. Handle joining the lobby
    socket.on('JOIN_LOBBY', (data) => {
        const playersArray = Object.values(gameState.players);

        if (playersArray.length >= 4) {
            socket.emit('JOIN_ERROR', { message: 'Arena is full! Maximum 4 players.' });
            return;
        }

        const nameExists = playersArray.some(p => p.name.toLowerCase() === data.name.toLowerCase());
        if (nameExists) {
            socket.emit('JOIN_ERROR', { message: 'Name already taken. Choose a unique name.' });
            return;
        }

        const playerNumber = getNextPlayerNumber();
        gameState.players[socket.id] = {
            id: socket.id,
            name: data.name,
            playerNumber: playerNumber,
            x: ARENA_WIDTH / 2,
            y: ARENA_HEIGHT / 2,
            dx: 0,
            dy: 0,
            color: ['#00d9ff', '#ff3f68', '#29ff9a', '#ffb000'][playerNumber - 1], // Cycle colors matching styles.css
            isAlive: true,
            score: 0
        };

        socket.emit('JOIN_SUCCESS', { playerId: socket.id });
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
    });

    // 2. Handle the Host starting the game
    socket.on('START_GAME', () => {
        const player = gameState.players[socket.id];
        // Only P1 (Host) can trigger start
        if (!player || player.playerNumber !== 1) {
            socket.emit('START_ERROR', { message: 'Only Player 1 can start the match.' });
            return;
        }

        if (Object.keys(gameState.players).length < 2) {
            socket.emit('START_ERROR', { message: 'At least 2 players are required to start.' });
            return;
        }

        // Advance state to countdown
        gameState.gameStatus = "COUNTDOWN";
        gameState.timer = 3;
        io.emit('GAME_STATE_UPDATE', gameState);

        // Run a simple 1-second interval handler just for the countdown clock
        let countdownInterval = setInterval(() => {
            gameState.timer--;
            if (gameState.timer < 0) {
                clearInterval(countdownInterval);
                gameState.gameStatus = "PLAYING";

                // Position players symmetrically at their starting edges facing the center
                Object.values(gameState.players).forEach(p => {
                    if (p.playerNumber === 1) { p.x = 400; p.y = 50;  p.dx = 0; p.dy = 4;  }  // Top facing Down
                    if (p.playerNumber === 2) { p.x = 400; p.y = 750; p.dx = 0; p.dy = -4; }  // Bottom facing Up
                    if (p.playerNumber === 3) { p.x = 50;  p.y = 400; p.dx = 4; p.dy = 0;  }  // Left facing Right
                    if (p.playerNumber === 4) { p.x = 750; p.y = 400; p.dx = -4; p.dy = 0; }  // Right facing Left
                });
            }
            io.emit('GAME_STATE_UPDATE', gameState);
        }, 1000);
    });

    // 3. Handle Pause Menu (ESC Key event sent by client.js)
    socket.on('TOGGLE_PAUSE', () => {
        const player = gameState.players[socket.id];
        if (!player) return;

        if (gameState.gameStatus === "PLAYING") {
            gameState.gameStatus = "PAUSED";
        } else if (gameState.gameStatus === "PAUSED") {
            gameState.gameStatus = "PLAYING";
        }
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    // 4. Handle steering inputs
    socket.on('PLAYER_INPUT', (data) => {
        const player = gameState.players[socket.id];
        if (!player || !player.isAlive || gameState.gameStatus !== "PLAYING") return;

        switch (data.turn) {
            case 'UP':    if (player.dy === 0) { player.dx = 0; player.dy = -4; } break;
            case 'DOWN':  if (player.dy === 0) { player.dx = 0; player.dy = 4; }  break;
            case 'LEFT':  if (player.dx === 0) { player.dx = -4; player.dy = 0; } break;
            case 'RIGHT': if (player.dx === 0) { player.dx = 4; player.dy = 0; }  break;
        }
    });

    // 5. Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete gameState.players[socket.id];

        // If empty, revert back to lobby state
        if (Object.keys(gameState.players).length === 0) {
            gameState.gameStatus = "LOBBY";
            gameState.trails = [];
        }

        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });
});

// Authoritative continuous update loop
const TICK_RATE = 30;
setInterval(() => {
    if (gameState.gameStatus !== "PLAYING") return;
    updateGamePhysics();
    io.emit('GAME_STATE_UPDATE', gameState);
}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Game server running on port http://localhost:${PORT}`);
});
