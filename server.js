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
    '#168BFF', // P1 - blue
    '#FF365F', // P2 - red
    '#24E879', // P3 - green
    '#FFE14A'  // P4 - yellow
];

let gameState = {
    gameStatus: "LOBBY", // LOBBY, COUNTDOWN, PLAYING, PAUSED, GAME_OVER
    timer: 0,
    players: {}, // Keyed by socket.id
    trails: []   // Array of solid trail line rectangles
};

// --- CLIENT NETWORK CONNECTION LOGIC ---
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send the current lobby snapshot immediately to newly connected clients.
    socket.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));

    // 1. Handle player joining the lobby
    socket.on('JOIN_LOBBY', (data) => {
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

    // 2. Handle real-time user steering inputs
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

    // 3. Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
        io.emit('ROOM_STATE_UPDATE', Object.values(gameState.players));
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
