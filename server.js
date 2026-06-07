import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static assets from the /public folder
app.use(express.static(path.join(import.meta.dirname, 'public')));

// --- GAME STATE CONTEXT ---
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 800;
const PLAYER_COLORS = [
    '#00D9FF', // P1 - cyan blue
    '#FF315B', // P2 - neon red
    '#39FF88', // P3 - neon green
    '#FFE44D'  // P4 - neon yellow
];

let gameState = {
    gameStatus: "LOBBY", // LOBBY, COUNTDOWN, PLAYING, PAUSED, GAME_OVER
    timer: 0,
    players: {}, // Keyed by socket.id
    trails: []   // Array of solid trail line rectangles
};
let countdownInterval = null;

function broadcastGameState() {
    io.emit('GAME_STATE_UPDATE', gameState);
}

function startCountdown() {
    gameState.gameStatus = 'COUNTDOWN';
    gameState.timer = 3;
    broadcastGameState();

    countdownInterval = setInterval(() => {
        gameState.timer -= 1;
        broadcastGameState();

        if (gameState.timer === 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;

            setTimeout(() => {
                gameState.gameStatus = 'PLAYING';
                broadcastGameState();
            }, 1500);
        }
    }, 1000);
}

function reassignLobbySlots() {
    Object.values(gameState.players)
        .sort((firstPlayer, secondPlayer) =>
            firstPlayer.playerNumber - secondPlayer.playerNumber
        )
        .forEach((player, index) => {
            player.playerNumber = index + 1;
            player.color = PLAYER_COLORS[index];
        });
}

// --- CLIENT NETWORK CONNECTION LOGIC ---
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send the current lobby snapshot immediately to newly connected clients.
    socket.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
    socket.emit('GAME_STATE_UPDATE', gameState);

    // 1. Handle player joining the lobby
    socket.on('JOIN_LOBBY', (data) => {
        if (gameState.gameStatus !== 'LOBBY') {
            socket.emit('JOIN_ERROR', { message: 'The game has already started.' });
            return;
        }

        if (gameState.players[socket.id]) {
            socket.emit('JOIN_ERROR', { message: 'You have already joined this lobby.' });
            return;
        }

        // Simple verification to ensure names are unique
        const nameExists = Object.values(gameState.players).some(p => p.name === data.name);
        if (nameExists) {
            socket.emit('JOIN_ERROR', { message: 'Name already taken. Choose a unique name.' });
            return;
        }

        const usedColors = new Set(
            Object.values(gameState.players).map(player => player.color)
        );
        const playerSlot = PLAYER_COLORS.findIndex(
            playerColor => !usedColors.has(playerColor)
        );

        if (playerSlot === -1) {
            socket.emit('JOIN_ERROR', { message: 'The lobby is full. Maximum 4 players.' });
            return;
        }

        const color = PLAYER_COLORS[playerSlot];

        // Initialize player structure on server side with default parameters
        gameState.players[socket.id] = {
            id: socket.id,
            name: data.name,
            playerNumber: playerSlot + 1,
            x: ARENA_WIDTH / 2, // Temporary placeholder spawn coordinates
            y: ARENA_HEIGHT / 2,
            dx: 0, // Initial velocity vectors
            dy: 0,
            color,
            isAlive: true,
            score: 0
        };

        // Notify client they successfully joined and broadcast updated lobby list
        socket.emit('JOIN_SUCCESS', { playerId: socket.id });
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
    });

    // 2. Allow P1 to start when at least two players have joined.
    socket.on('START_GAME', () => {
        const player = gameState.players[socket.id];
        const playerCount = Object.keys(gameState.players).length;

        if (gameState.gameStatus !== 'LOBBY') {
            socket.emit('START_ERROR', { message: 'The game has already started.' });
            return;
        }

        if (!player || player.playerNumber !== 1) {
            socket.emit('START_ERROR', { message: 'Only P1 can start the game.' });
            return;
        }

        if (playerCount < 2) {
            socket.emit('START_ERROR', { message: 'At least 2 players are required to start.' });
            return;
        }

        startCountdown();
    });

    // 3. Handle real-time user steering inputs
    socket.on('PLAYER_INPUT', (data) => {
        const player = gameState.players[socket.id];
        if (!player || !player.isAlive || gameState.gameStatus !== "PLAYING") return;

        // Process 90-degree vector adjustments and prevent self-inversion
        switch (data.turn) {
            case 'UP':
                if (player.dy === 0) { player.dx = 0; player.dy = -4; } // Moves 4px per tick
                break;
            case 'DOWN':
                if (player.dy === 0) { player.dx = 0; player.dy = 4; }
                break;
            case 'LEFT':
                if (player.dx === 0) { player.dx = -4; player.dy = 0; }
                break;
            case 'RIGHT':
                if (player.dx === 0) { player.dx = 4; player.dy = 0; }
                break;
        }
    });

    // 4. Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const disconnectedPlayer = gameState.players[socket.id];
        const hostLeft = disconnectedPlayer?.playerNumber === 1;

        delete gameState.players[socket.id];

        if (gameState.gameStatus === 'LOBBY') {
            reassignLobbySlots();
        }

        const players = Object.values(gameState.players);
        io.emit('ROOM_STATE_UPDATE', players);

        if (gameState.gameStatus === 'LOBBY' && hostLeft && players.length > 0) {
            const newHost = players.find(player => player.playerNumber === 1);

            io.to(newHost.id).emit('HOST_CHANGED', {
                message: `${disconnectedPlayer.name} left the lobby. You are now the host.`
            });
        }
    });
});

// --- AUTHORITATIVE CORE GAME LOOP ---
const TICK_RATE = 30; // 30 updates per second (~33.3ms intervals)

setInterval(() => {
    if (gameState.gameStatus !== "PLAYING") return;

    // Process physics logic for every living player
    Object.values(gameState.players).forEach(player => {
        if (!player.isAlive) return;

        // Apply continuous physics vectors
        player.x += player.dx;
        player.y += player.dy;

        // TODO: Handle screen wrapping calculations here
        // TODO: Update active trail line dimensions here
        // TODO: Process trail collision interception mechanics here
    });

    // Broadcast the absolute source-of-truth state payload to all client viewports
    io.emit('GAME_STATE_UPDATE', gameState);

}, 1000 / TICK_RATE);

// Launch local HTTP instance
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Game server running on port http://localhost:${PORT}`);
});
