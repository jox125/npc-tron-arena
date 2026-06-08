import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import {
    gameState,
    updateGamePhysics,
    ARENA_WIDTH,
    ARENA_HEIGHT,
    getNextPlayerNumber,
    eliminatePlayer,
    finishRound,
    resetGameToLobby
} from './src/gameEngine.js';

const COUNTDOWN_STEP_MS = 750;
let countdownInterval = null;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(import.meta.dirname, 'public')));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    socket.emit('GAME_STATE_UPDATE', gameState);

    // 1. Handle joining the lobby
    socket.on('JOIN_LOBBY', (data) => {
        if (gameState.gameStatus !== "LOBBY") {
            socket.emit('JOIN_ERROR', {
                code: 'MATCH_IN_PROGRESS',
                message: 'A match is currently in progress. Wait for the next lobby.'
            });
            return;
        }

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

        if (gameState.gameStatus !== "LOBBY") {
            socket.emit('START_ERROR', { message: 'The match has already started.' });
            return;
        }

        if (Object.keys(gameState.players).length < 2) {
            socket.emit('START_ERROR', { message: 'At least 2 players are required to start.' });
            return;
        }

        // Advance state to countdown
        gameState.gameStatus = "COUNTDOWN";
        gameState.timer = 3;
        gameState.pausedBy = null;
        gameState.roundResult = null;
        gameState.eliminationOrder = [];
        gameState.eliminatedPlayers = {};
        gameState.trails = [];
        Object.values(gameState.players).forEach(p => {
            p.isAlive = true;
            delete p.eliminatedAt;
        });
        io.emit('GAME_STATE_UPDATE', gameState);

        // Four 750 ms phases: 3, 2, 1, then the cycle launch animation.
        countdownInterval = setInterval(() => {
            gameState.timer--;
            if (gameState.timer < 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
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
        }, COUNTDOWN_STEP_MS);
    });

    // 3. Handle Pause Menu (ESC Key event sent by client.js)
    socket.on('TOGGLE_PAUSE', () => {
        const player = gameState.players[socket.id];
        if (!player) return;

        if (gameState.gameStatus === "PLAYING") {
            gameState.gameStatus = "PAUSED";
            gameState.pausedBy = {
                id: player.id,
                name: player.name,
                playerNumber: player.playerNumber,
                color: player.color
            };
        } else if (gameState.gameStatus === "PAUSED") {
            gameState.gameStatus = "PLAYING";
            gameState.pausedBy = null;
        }
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    // 4. Return all connected players to the lobby after the round results.
    socket.on('RETURN_TO_LOBBY', () => {
        const player = gameState.players[socket.id];
        if (!player || player.playerNumber !== 1) {
            socket.emit('RETURN_TO_LOBBY_ERROR', {
                message: 'Only Player 1 can return the room to the lobby.'
            });
            return;
        }

        if (gameState.gameStatus !== "GAME_OVER") {
            socket.emit('RETURN_TO_LOBBY_ERROR', {
                message: 'The round must be finished before returning to the lobby.'
            });
            return;
        }

        resetGameToLobby();
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });

    // 5. Handle steering inputs
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

    // 6. Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        if (["PLAYING", "PAUSED"].includes(gameState.gameStatus)) {
            eliminatePlayer(socket.id);
            resolveRoundEnd();
        }

        delete gameState.players[socket.id];

        if (gameState.gameStatus === "COUNTDOWN"
            && Object.keys(gameState.players).length < 2) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            resetGameToLobby();
        }

        // If empty, revert back to lobby state
        if (Object.keys(gameState.players).length === 0) {
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            resetGameToLobby();
        }

        ensureHost();

        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
        io.emit('GAME_STATE_UPDATE', gameState);
    });
});

// Authoritative continuous update loop
const TICK_RATE = 30;
setInterval(() => {
    if (gameState.gameStatus !== "PLAYING") return;
    updateGamePhysics();
    resolveRoundEnd();
    io.emit('GAME_STATE_UPDATE', gameState);
}, 1000 / TICK_RATE);

function resolveRoundEnd() {
    if (!["PLAYING", "PAUSED"].includes(gameState.gameStatus)) return false;

    const players = Object.values(gameState.players);
    if (players.length < 2) return false;

    players
        .filter(player => !player.isAlive && !gameState.eliminationOrder.includes(player.id))
        .forEach(player => gameState.eliminationOrder.push(player.id));

    const alivePlayers = players.filter(player => player.isAlive);
    if (alivePlayers.length > 1) return false;

    return finishRound(alivePlayers[0]?.id ?? null, gameState.eliminationOrder);
}

function ensureHost() {
    const players = Object.values(gameState.players);
    if (players.length === 0 || players.some(player => player.playerNumber === 1)) {
        return;
    }

    const newHost = players
        .sort((a, b) => a.playerNumber - b.playerNumber)[0];
    newHost.playerNumber = 1;
    io.emit('HOST_CHANGED', {
        message: `${newHost.name} is now Player 1 and room host.`
    });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Game server running on port http://localhost:${PORT}`);
});
